package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/spf13/pflag"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer"
	utilruntime "k8s.io/apimachinery/pkg/util/runtime"
	"k8s.io/apiserver/pkg/registry/rest"
	genericapiserver "k8s.io/apiserver/pkg/server"
	genericoptions "k8s.io/apiserver/pkg/server/options"
	"k8s.io/apiserver/pkg/util/compatibility"
	"k8s.io/klog/v2"
	openapicommon "k8s.io/kube-openapi/pkg/common"
	"k8s.io/kube-openapi/pkg/spec3"
	"k8s.io/kube-openapi/pkg/validation/spec"

	arkv1alpha1 "mckinsey.com/ark-apiserver/pkg/apis/ark/v1alpha1"
	queryregistry "mckinsey.com/ark-apiserver/pkg/registry/query"
	"mckinsey.com/ark-apiserver/pkg/storage"
	"mckinsey.com/ark-apiserver/pkg/storage/sqlite"
)

var (
	Scheme         = runtime.NewScheme()
	Codecs         = serializer.NewCodecFactory(Scheme)
	ParameterCodec = runtime.NewParameterCodec(Scheme)
)

func init() {
	utilruntime.Must(arkv1alpha1.AddToScheme(Scheme))
	utilruntime.Must(metav1.AddMetaToScheme(Scheme))
	metav1.AddToGroupVersion(Scheme, schema.GroupVersion{Group: "", Version: "v1"})
}

type ArkServerOptions struct {
	SecureServing *genericoptions.SecureServingOptionsWithLoopback

	StorageDriver    string
	SQLitePath       string
	PostgresHost     string
	PostgresPort     int
	PostgresDB       string
	PostgresUser     string
	PostgresPassword string
}

func NewArkServerOptions() *ArkServerOptions {
	o := &ArkServerOptions{
		SecureServing: genericoptions.NewSecureServingOptions().WithLoopback(),
		StorageDriver: "sqlite",
		SQLitePath:    "/data/ark.db",
	}
	return o
}

func (o *ArkServerOptions) AddFlags(fs *pflag.FlagSet) {
	o.SecureServing.AddFlags(fs)
	fs.StringVar(&o.StorageDriver, "storage-driver", o.StorageDriver, "Storage driver (sqlite, postgresql)")
	fs.StringVar(&o.SQLitePath, "sqlite-path", o.SQLitePath, "SQLite database path")
	fs.StringVar(&o.PostgresHost, "postgres-host", o.PostgresHost, "PostgreSQL host")
	fs.IntVar(&o.PostgresPort, "postgres-port", 5432, "PostgreSQL port")
	fs.StringVar(&o.PostgresDB, "postgres-db", "ark", "PostgreSQL database name")
	fs.StringVar(&o.PostgresUser, "postgres-user", "ark", "PostgreSQL user")
	fs.StringVar(&o.PostgresPassword, "postgres-password", "", "PostgreSQL password")
}

func (o *ArkServerOptions) Validate() []error {
	var errors []error
	if o.StorageDriver != "sqlite" && o.StorageDriver != "postgresql" {
		errors = append(errors, fmt.Errorf("invalid storage driver: %s", o.StorageDriver))
	}
	errors = append(errors, o.SecureServing.Validate()...)
	return errors
}

func (o *ArkServerOptions) RunArkServer(stopCh <-chan struct{}) error {
	if err := o.SecureServing.MaybeDefaultWithSelfSignedCerts("localhost", nil, nil); err != nil {
		return fmt.Errorf("error creating self-signed certificates: %v", err)
	}

	serverConfig := genericapiserver.NewConfig(Codecs)
	serverConfig.EffectiveVersion = compatibility.DefaultBuildEffectiveVersion()

	serverConfig.OpenAPIV3Config = &openapicommon.OpenAPIV3Config{
		IgnorePrefixes: []string{"/swaggerapi"},
		Info: &spec.Info{
			InfoProps: spec.InfoProps{
				Title:   "Ark API Server",
				Version: "v1alpha1",
			},
		},
		DefaultResponse: &spec3.Response{
			ResponseProps: spec3.ResponseProps{
				Description: "Default Response.",
			},
		},
		GetDefinitions: arkv1alpha1.GetOpenAPIDefinitions,
	}

	if err := o.SecureServing.ApplyTo(&serverConfig.SecureServing, &serverConfig.LoopbackClientConfig); err != nil {
		return err
	}

	converter := storage.NewArkTypeConverter()
	var backend storage.Backend
	var err error

	switch o.StorageDriver {
	case "sqlite":
		dir := filepath.Dir(o.SQLitePath)
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create data directory: %w", err)
		}
		backend, err = sqlite.New(o.SQLitePath, converter)
		if err != nil {
			return fmt.Errorf("failed to create SQLite backend: %w", err)
		}
	default:
		return fmt.Errorf("unsupported storage driver: %s", o.StorageDriver)
	}

	defer backend.Close()

	completedConfig := serverConfig.Complete(nil)
	server, err := completedConfig.New("ark-apiserver", genericapiserver.NewEmptyDelegate())
	if err != nil {
		return err
	}

	queryStorage := queryregistry.NewQueryStorage(backend, converter)

	apiGroupInfo := genericapiserver.NewDefaultAPIGroupInfo(arkv1alpha1.GroupName, Scheme, ParameterCodec, Codecs)
	apiGroupInfo.VersionedResourcesStorageMap[arkv1alpha1.SchemeGroupVersion.Version] = map[string]rest.Storage{
		"queries": queryStorage,
	}

	if err := server.InstallAPIGroup(&apiGroupInfo); err != nil {
		return fmt.Errorf("failed to install API group: %w", err)
	}

	klog.Info("Starting Ark API Server")
	return server.PrepareRun().Run(stopCh)
}

func main() {
	klog.InitFlags(nil)
	defer klog.Flush()

	options := NewArkServerOptions()
	fs := pflag.CommandLine
	options.AddFlags(fs)
	pflag.Parse()

	if errs := options.Validate(); len(errs) > 0 {
		for _, err := range errs {
			klog.Error(err)
		}
		os.Exit(1)
	}

	stopCh := genericapiserver.SetupSignalHandler()
	if err := options.RunArkServer(stopCh); err != nil {
		klog.Fatal(err)
	}
}
