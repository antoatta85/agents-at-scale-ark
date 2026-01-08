package storage

import (
	"encoding/json"
	"fmt"

	"k8s.io/apimachinery/pkg/runtime"

	arkv1alpha1 "mckinsey.com/ark-apiserver/pkg/apis/ark/v1alpha1"
)

type ArkTypeConverter struct{}

func NewArkTypeConverter() *ArkTypeConverter {
	return &ArkTypeConverter{}
}

func (c *ArkTypeConverter) NewObject(kind string) runtime.Object {
	switch kind {
	case "Query":
		return &arkv1alpha1.Query{}
	default:
		return nil
	}
}

func (c *ArkTypeConverter) NewListObject(kind string) runtime.Object {
	switch kind {
	case "Query":
		return &arkv1alpha1.QueryList{}
	default:
		return nil
	}
}

func (c *ArkTypeConverter) Encode(obj runtime.Object) ([]byte, error) {
	return json.Marshal(obj)
}

func (c *ArkTypeConverter) Decode(kind string, data []byte) (runtime.Object, error) {
	obj := c.NewObject(kind)
	if obj == nil {
		return nil, fmt.Errorf("unknown kind: %s", kind)
	}

	if err := json.Unmarshal(data, obj); err != nil {
		return nil, fmt.Errorf("failed to unmarshal: %w", err)
	}

	return obj, nil
}
