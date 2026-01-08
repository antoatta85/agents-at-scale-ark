package query

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	metainternalversion "k8s.io/apimachinery/pkg/apis/meta/internalversion"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apiserver/pkg/registry/rest"

	genericrequest "k8s.io/apiserver/pkg/endpoints/request"

	arkv1alpha1 "mckinsey.com/ark-apiserver/pkg/apis/ark/v1alpha1"
	arkstorage "mckinsey.com/ark-apiserver/pkg/storage"
)

type QueryStorage struct {
	backend   arkstorage.Backend
	converter arkstorage.TypeConverter
}

var _ rest.Storage = &QueryStorage{}
var _ rest.Getter = &QueryStorage{}
var _ rest.Lister = &QueryStorage{}
var _ rest.CreaterUpdater = &QueryStorage{}
var _ rest.GracefulDeleter = &QueryStorage{}
var _ rest.Scoper = &QueryStorage{}
var _ rest.SingularNameProvider = &QueryStorage{}

func NewQueryStorage(backend arkstorage.Backend, converter arkstorage.TypeConverter) *QueryStorage {
	return &QueryStorage{
		backend:   backend,
		converter: converter,
	}
}

func (s *QueryStorage) New() runtime.Object {
	return &arkv1alpha1.Query{}
}

func (s *QueryStorage) Destroy() {}

func (s *QueryStorage) NewList() runtime.Object {
	return &arkv1alpha1.QueryList{}
}

func (s *QueryStorage) NamespaceScoped() bool {
	return true
}

func (s *QueryStorage) GetSingularName() string {
	return "query"
}

func (s *QueryStorage) Get(ctx context.Context, name string, options *metav1.GetOptions) (runtime.Object, error) {
	namespace := getNamespace(ctx)
	obj, err := s.backend.Get(ctx, "Query", namespace, name)
	if err != nil {
		return nil, apierrors.NewNotFound(schema.GroupResource{Group: arkv1alpha1.GroupName, Resource: "queries"}, name)
	}
	return obj, nil
}

func (s *QueryStorage) List(ctx context.Context, options *metainternalversion.ListOptions) (runtime.Object, error) {
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

	objects, continueToken, err := s.backend.List(ctx, "Query", namespace, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to list queries: %w", err)
	}

	list := &arkv1alpha1.QueryList{
		TypeMeta: metav1.TypeMeta{
			APIVersion: arkv1alpha1.SchemeGroupVersion.String(),
			Kind:       "QueryList",
		},
	}
	list.Continue = continueToken

	for _, obj := range objects {
		query, ok := obj.(*arkv1alpha1.Query)
		if !ok {
			continue
		}
		list.Items = append(list.Items, *query)
	}

	return list, nil
}

func (s *QueryStorage) Create(ctx context.Context, obj runtime.Object, createValidation rest.ValidateObjectFunc, options *metav1.CreateOptions) (runtime.Object, error) {
	query, ok := obj.(*arkv1alpha1.Query)
	if !ok {
		return nil, fmt.Errorf("expected Query object")
	}

	if createValidation != nil {
		if err := createValidation(ctx, obj); err != nil {
			return nil, err
		}
	}

	namespace := getNamespace(ctx)
	if query.Namespace == "" {
		query.Namespace = namespace
	}

	if query.UID == "" {
		query.UID = types.UID(uuid.New().String())
	}
	if query.CreationTimestamp.IsZero() {
		query.CreationTimestamp = metav1.Now()
	}
	if query.Status.Phase == "" {
		query.Status.Phase = "pending"
	}

	if err := s.backend.Create(ctx, "Query", query.Namespace, query.Name, query); err != nil {
		return nil, fmt.Errorf("failed to create query: %w", err)
	}

	return s.Get(ctx, query.Name, &metav1.GetOptions{})
}

func (s *QueryStorage) Update(ctx context.Context, name string, objInfo rest.UpdatedObjectInfo, createValidation rest.ValidateObjectFunc, updateValidation rest.ValidateObjectUpdateFunc, forceAllowCreate bool, options *metav1.UpdateOptions) (runtime.Object, bool, error) {
	namespace := getNamespace(ctx)

	existing, err := s.backend.Get(ctx, "Query", namespace, name)
	if err != nil {
		if forceAllowCreate {
			obj, err := objInfo.UpdatedObject(ctx, nil)
			if err != nil {
				return nil, false, err
			}
			created, err := s.Create(ctx, obj, createValidation, &metav1.CreateOptions{})
			return created, true, err
		}
		return nil, false, apierrors.NewNotFound(schema.GroupResource{Group: arkv1alpha1.GroupName, Resource: "queries"}, name)
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

	if err := s.backend.Update(ctx, "Query", namespace, name, updated); err != nil {
		return nil, false, fmt.Errorf("failed to update query: %w", err)
	}

	result, err := s.Get(ctx, name, &metav1.GetOptions{})
	return result, false, err
}

func (s *QueryStorage) Delete(ctx context.Context, name string, deleteValidation rest.ValidateObjectFunc, options *metav1.DeleteOptions) (runtime.Object, bool, error) {
	namespace := getNamespace(ctx)

	existing, err := s.backend.Get(ctx, "Query", namespace, name)
	if err != nil {
		return nil, false, apierrors.NewNotFound(schema.GroupResource{Group: arkv1alpha1.GroupName, Resource: "queries"}, name)
	}

	if deleteValidation != nil {
		if err := deleteValidation(ctx, existing); err != nil {
			return nil, false, err
		}
	}

	if err := s.backend.Delete(ctx, "Query", namespace, name); err != nil {
		return nil, false, fmt.Errorf("failed to delete query: %w", err)
	}

	return existing, true, nil
}

func (s *QueryStorage) ConvertToTable(ctx context.Context, obj runtime.Object, tableOptions runtime.Object) (*metav1.Table, error) {
	table := &metav1.Table{
		ColumnDefinitions: []metav1.TableColumnDefinition{
			{Name: "Name", Type: "string", Format: "name"},
			{Name: "Type", Type: "string"},
			{Name: "Phase", Type: "string"},
			{Name: "Duration", Type: "string"},
			{Name: "Age", Type: "string", Format: "date"},
		},
	}

	switch t := obj.(type) {
	case *arkv1alpha1.Query:
		table.Rows = append(table.Rows, queryToTableRow(t))
	case *arkv1alpha1.QueryList:
		for i := range t.Items {
			table.Rows = append(table.Rows, queryToTableRow(&t.Items[i]))
		}
	}

	return table, nil
}

func queryToTableRow(query *arkv1alpha1.Query) metav1.TableRow {
	duration := ""
	if query.Status.Duration != nil {
		duration = query.Status.Duration.Duration.String()
	}
	return metav1.TableRow{
		Object: runtime.RawExtension{Object: query},
		Cells: []interface{}{
			query.Name,
			query.Spec.Type,
			query.Status.Phase,
			duration,
			query.CreationTimestamp.Time,
		},
	}
}

func getNamespace(ctx context.Context) string {
	if reqInfo, ok := genericrequest.RequestInfoFrom(ctx); ok {
		return reqInfo.Namespace
	}
	return "default"
}
