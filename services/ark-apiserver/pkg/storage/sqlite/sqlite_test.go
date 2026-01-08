package sqlite

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"

	arkv1alpha1 "mckinsey.com/ark-apiserver/pkg/apis/ark/v1alpha1"
	"mckinsey.com/ark-apiserver/pkg/storage"
)

func setupTestBackend(t *testing.T) (*SQLiteBackend, func()) {
	t.Helper()
	tmpDir, err := os.MkdirTemp("", "ark-apiserver-test")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tmpDir, "test.db")
	converter := storage.NewArkTypeConverter()
	backend, err := New(dbPath, converter)
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("failed to create backend: %v", err)
	}

	cleanup := func() {
		backend.Close()
		os.RemoveAll(tmpDir)
	}

	return backend, cleanup
}

func TestCreateAndGet(t *testing.T) {
	backend, cleanup := setupTestBackend(t)
	defer cleanup()

	ctx := context.Background()
	query := &arkv1alpha1.Query{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "ark.mckinsey.com/v1alpha1",
			Kind:       "Query",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-query",
			Namespace: "default",
			UID:       "test-uid-123",
		},
		Spec: arkv1alpha1.QuerySpec{
			Type: "chat",
		},
	}

	err := backend.Create(ctx, "Query", "default", "test-query", query)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	obj, err := backend.Get(ctx, "Query", "default", "test-query")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}

	got, ok := obj.(*arkv1alpha1.Query)
	if !ok {
		t.Fatalf("expected *Query, got %T", obj)
	}

	if got.Name != "test-query" {
		t.Errorf("expected name test-query, got %s", got.Name)
	}
	if got.Spec.Type != "chat" {
		t.Errorf("expected type chat, got %s", got.Spec.Type)
	}
}

func TestList(t *testing.T) {
	backend, cleanup := setupTestBackend(t)
	defer cleanup()

	ctx := context.Background()

	for i := 0; i < 3; i++ {
		name := fmt.Sprintf("test-query-%d", i)
		query := &arkv1alpha1.Query{
			TypeMeta: metav1.TypeMeta{
				APIVersion: "ark.mckinsey.com/v1alpha1",
				Kind:       "Query",
			},
			ObjectMeta: metav1.ObjectMeta{
				Name:      name,
				Namespace: "default",
				UID:       types.UID(fmt.Sprintf("test-uid-%d", i)),
			},
			Spec: arkv1alpha1.QuerySpec{
				Type: "chat",
			},
		}
		if err := backend.Create(ctx, "Query", "default", query.Name, query); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
	}

	objects, _, err := backend.List(ctx, "Query", "default", storage.ListOptions{})
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}

	if len(objects) != 3 {
		t.Errorf("expected 3 objects, got %d", len(objects))
	}
}

func TestUpdate(t *testing.T) {
	backend, cleanup := setupTestBackend(t)
	defer cleanup()

	ctx := context.Background()
	query := &arkv1alpha1.Query{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "ark.mckinsey.com/v1alpha1",
			Kind:       "Query",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-query",
			Namespace: "default",
			UID:       "test-uid-123",
		},
		Spec: arkv1alpha1.QuerySpec{
			Type: "chat",
		},
	}

	if err := backend.Create(ctx, "Query", "default", "test-query", query); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	query.Spec.Type = "completion"
	if err := backend.Update(ctx, "Query", "default", "test-query", query); err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	obj, err := backend.Get(ctx, "Query", "default", "test-query")
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}

	got := obj.(*arkv1alpha1.Query)
	if got.Spec.Type != "completion" {
		t.Errorf("expected type completion, got %s", got.Spec.Type)
	}
}

func TestDelete(t *testing.T) {
	backend, cleanup := setupTestBackend(t)
	defer cleanup()

	ctx := context.Background()
	query := &arkv1alpha1.Query{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "ark.mckinsey.com/v1alpha1",
			Kind:       "Query",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-query",
			Namespace: "default",
			UID:       "test-uid-123",
		},
		Spec: arkv1alpha1.QuerySpec{
			Type: "chat",
		},
	}

	if err := backend.Create(ctx, "Query", "default", "test-query", query); err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if err := backend.Delete(ctx, "Query", "default", "test-query"); err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	_, err := backend.Get(ctx, "Query", "default", "test-query")
	if err == nil {
		t.Error("expected error after delete, got nil")
	}
}

func TestGetNotFound(t *testing.T) {
	backend, cleanup := setupTestBackend(t)
	defer cleanup()

	ctx := context.Background()
	_, err := backend.Get(ctx, "Query", "default", "nonexistent")
	if err == nil {
		t.Error("expected error for nonexistent resource, got nil")
	}
}

func TestNamespaceIsolation(t *testing.T) {
	backend, cleanup := setupTestBackend(t)
	defer cleanup()

	ctx := context.Background()

	query1 := &arkv1alpha1.Query{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "ark.mckinsey.com/v1alpha1",
			Kind:       "Query",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-query",
			Namespace: "ns1",
			UID:       "uid-1",
		},
	}
	query2 := &arkv1alpha1.Query{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "ark.mckinsey.com/v1alpha1",
			Kind:       "Query",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-query",
			Namespace: "ns2",
			UID:       "uid-2",
		},
	}

	if err := backend.Create(ctx, "Query", "ns1", "test-query", query1); err != nil {
		t.Fatalf("Create ns1 failed: %v", err)
	}
	if err := backend.Create(ctx, "Query", "ns2", "test-query", query2); err != nil {
		t.Fatalf("Create ns2 failed: %v", err)
	}

	objects1, _, _ := backend.List(ctx, "Query", "ns1", storage.ListOptions{})
	objects2, _, _ := backend.List(ctx, "Query", "ns2", storage.ListOptions{})

	if len(objects1) != 1 {
		t.Errorf("expected 1 object in ns1, got %d", len(objects1))
	}
	if len(objects2) != 1 {
		t.Errorf("expected 1 object in ns2, got %d", len(objects2))
	}
}
