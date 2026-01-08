package generic

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	metainternalversion "k8s.io/apimachinery/pkg/apis/meta/internalversion"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	genericrequest "k8s.io/apiserver/pkg/endpoints/request"
	"k8s.io/apiserver/pkg/registry/rest"

	arkv1alpha1 "mckinsey.com/ark-apiserver/pkg/apis/ark/v1alpha1"
	arkstorage "mckinsey.com/ark-apiserver/pkg/storage"
)

type ResourceConfig struct {
	Kind         string
	Resource     string
	SingularName string
	NewFunc      func() runtime.Object
	NewListFunc  func() runtime.Object
}

type GenericStorage struct {
	backend   arkstorage.Backend
	converter arkstorage.TypeConverter
	config    ResourceConfig
}

var _ rest.Storage = &GenericStorage{}
var _ rest.Getter = &GenericStorage{}
var _ rest.Lister = &GenericStorage{}
var _ rest.CreaterUpdater = &GenericStorage{}
var _ rest.GracefulDeleter = &GenericStorage{}
var _ rest.Scoper = &GenericStorage{}
var _ rest.SingularNameProvider = &GenericStorage{}

func NewGenericStorage(backend arkstorage.Backend, converter arkstorage.TypeConverter, config ResourceConfig) *GenericStorage {
	return &GenericStorage{
		backend:   backend,
		converter: converter,
		config:    config,
	}
}

func (s *GenericStorage) New() runtime.Object {
	return s.config.NewFunc()
}

func (s *GenericStorage) Destroy() {}

func (s *GenericStorage) NewList() runtime.Object {
	return s.config.NewListFunc()
}

func (s *GenericStorage) NamespaceScoped() bool {
	return true
}

func (s *GenericStorage) GetSingularName() string {
	return s.config.SingularName
}

func (s *GenericStorage) Get(ctx context.Context, name string, options *metav1.GetOptions) (runtime.Object, error) {
	namespace := getNamespace(ctx)
	obj, err := s.backend.Get(ctx, s.config.Kind, namespace, name)
	if err != nil {
		return nil, apierrors.NewNotFound(schema.GroupResource{Group: arkv1alpha1.GroupName, Resource: s.config.Resource}, name)
	}
	return obj, nil
}

func (s *GenericStorage) List(ctx context.Context, options *metainternalversion.ListOptions) (runtime.Object, error) {
	namespace := getNamespace(ctx)
	opts := arkstorage.ListOptions{}
	if options != nil {
		if options.LabelSelector != nil {
			opts.LabelSelector = options.LabelSelector.String()
		}
		if options.FieldSelector != nil {
			opts.FieldSelector = options.FieldSelector.String()
		}
		opts.Limit = options.Limit
		opts.Continue = options.Continue
	}

	objects, continueToken, err := s.backend.List(ctx, s.config.Kind, namespace, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list %s: %w", s.config.Resource, err)
	}

	list := s.config.NewListFunc()
	if err := setListItems(list, objects, continueToken); err != nil {
		return nil, err
	}

	return list, nil
}

func (s *GenericStorage) Create(ctx context.Context, obj runtime.Object, createValidation rest.ValidateObjectFunc, options *metav1.CreateOptions) (runtime.Object, error) {
	if createValidation != nil {
		if err := createValidation(ctx, obj); err != nil {
			return nil, err
		}
	}

	namespace := getNamespace(ctx)
	accessor, err := meta.Accessor(obj)
	if err != nil {
		return nil, fmt.Errorf("failed to access object metadata: %w", err)
	}

	if accessor.GetNamespace() == "" {
		accessor.SetNamespace(namespace)
	}
	if accessor.GetUID() == "" {
		accessor.SetUID(types.UID(uuid.New().String()))
	}
	ts := accessor.GetCreationTimestamp()
	if ts.IsZero() {
		accessor.SetCreationTimestamp(metav1.Now())
	}

	if err := s.backend.Create(ctx, s.config.Kind, accessor.GetNamespace(), accessor.GetName(), obj); err != nil {
		return nil, fmt.Errorf("failed to create %s: %w", s.config.SingularName, err)
	}

	return s.Get(ctx, accessor.GetName(), &metav1.GetOptions{})
}

func (s *GenericStorage) Update(ctx context.Context, name string, objInfo rest.UpdatedObjectInfo, createValidation rest.ValidateObjectFunc, updateValidation rest.ValidateObjectUpdateFunc, forceAllowCreate bool, options *metav1.UpdateOptions) (runtime.Object, bool, error) {
	namespace := getNamespace(ctx)

	existing, err := s.backend.Get(ctx, s.config.Kind, namespace, name)
	if err != nil {
		if forceAllowCreate {
			obj, err := objInfo.UpdatedObject(ctx, nil)
			if err != nil {
				return nil, false, err
			}
			created, err := s.Create(ctx, obj, createValidation, &metav1.CreateOptions{})
			return created, true, err
		}
		return nil, false, apierrors.NewNotFound(schema.GroupResource{Group: arkv1alpha1.GroupName, Resource: s.config.Resource}, name)
	}

	updated, err := objInfo.UpdatedObject(ctx, existing)
	if err != nil {
		return nil, false, fmt.Errorf("failed to get updated object: %w", err)
	}

	if updateValidation != nil {
		if err := updateValidation(ctx, updated, existing); err != nil {
			return nil, false, err
		}
	}

	if err := s.backend.Update(ctx, s.config.Kind, namespace, name, updated); err != nil {
		return nil, false, fmt.Errorf("failed to update %s: %w", s.config.SingularName, err)
	}

	result, err := s.Get(ctx, name, &metav1.GetOptions{})
	return result, false, err
}

func (s *GenericStorage) Delete(ctx context.Context, name string, deleteValidation rest.ValidateObjectFunc, options *metav1.DeleteOptions) (runtime.Object, bool, error) {
	namespace := getNamespace(ctx)

	existing, err := s.backend.Get(ctx, s.config.Kind, namespace, name)
	if err != nil {
		return nil, false, apierrors.NewNotFound(schema.GroupResource{Group: arkv1alpha1.GroupName, Resource: s.config.Resource}, name)
	}

	if deleteValidation != nil {
		if err := deleteValidation(ctx, existing); err != nil {
			return nil, false, err
		}
	}

	if err := s.backend.Delete(ctx, s.config.Kind, namespace, name); err != nil {
		return nil, false, fmt.Errorf("failed to delete %s: %w", s.config.SingularName, err)
	}

	return existing, true, nil
}

func (s *GenericStorage) ConvertToTable(ctx context.Context, obj runtime.Object, tableOptions runtime.Object) (*metav1.Table, error) {
	table := &metav1.Table{
		ColumnDefinitions: []metav1.TableColumnDefinition{
			{Name: "Name", Type: "string", Format: "name"},
			{Name: "Age", Type: "string", Format: "date"},
		},
	}

	if items, err := meta.ExtractList(obj); err == nil {
		for _, item := range items {
			table.Rows = append(table.Rows, objectToTableRow(item))
		}
		return table, nil
	}

	table.Rows = append(table.Rows, objectToTableRow(obj))
	return table, nil
}

func objectToTableRow(obj runtime.Object) metav1.TableRow {
	accessor, _ := meta.Accessor(obj)
	return metav1.TableRow{
		Object: runtime.RawExtension{Object: obj},
		Cells: []interface{}{
			accessor.GetName(),
			accessor.GetCreationTimestamp().Time,
		},
	}
}

func getNamespace(ctx context.Context) string {
	if reqInfo, ok := genericrequest.RequestInfoFrom(ctx); ok {
		return reqInfo.Namespace
	}
	return "default"
}

func setListItems(list runtime.Object, objects []runtime.Object, continueToken string) error {
	switch l := list.(type) {
	case *arkv1alpha1.QueryList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.Query); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	case *arkv1alpha1.AgentList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.Agent); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	case *arkv1alpha1.ModelList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.Model); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	case *arkv1alpha1.TeamList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.Team); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	case *arkv1alpha1.ToolList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.Tool); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	case *arkv1alpha1.MemoryList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.Memory); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	case *arkv1alpha1.MCPServerList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.MCPServer); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	case *arkv1alpha1.EvaluationList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.Evaluation); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	case *arkv1alpha1.EvaluatorList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.Evaluator); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	case *arkv1alpha1.A2ATaskList:
		for _, obj := range objects {
			if item, ok := obj.(*arkv1alpha1.A2ATask); ok {
				l.Items = append(l.Items, *item)
			}
		}
		l.Continue = continueToken
	default:
		return fmt.Errorf("unknown list type: %T", list)
	}
	return nil
}
