package v1alpha1

import (
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func (in *Query) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}
	out := new(Query)
	in.DeepCopyInto(out)
	return out
}

func (in *Query) DeepCopyInto(out *Query) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ObjectMeta.DeepCopyInto(&out.ObjectMeta)
	in.Spec.DeepCopyInto(&out.Spec)
	in.Status.DeepCopyInto(&out.Status)
}

func (in *QueryList) DeepCopyObject() runtime.Object {
	if in == nil {
		return nil
	}
	out := new(QueryList)
	in.DeepCopyInto(out)
	return out
}

func (in *QueryList) DeepCopyInto(out *QueryList) {
	*out = *in
	out.TypeMeta = in.TypeMeta
	in.ListMeta.DeepCopyInto(&out.ListMeta)
	if in.Items != nil {
		in, out := &in.Items, &out.Items
		*out = make([]Query, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

func (in *QuerySpec) DeepCopyInto(out *QuerySpec) {
	*out = *in
	in.Input.DeepCopyInto(&out.Input)
	if in.Parameters != nil {
		in, out := &in.Parameters, &out.Parameters
		*out = make([]Parameter, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
	if in.Target != nil {
		in, out := &in.Target, &out.Target
		*out = new(QueryTarget)
		**out = **in
	}
	if in.Selector != nil {
		in, out := &in.Selector, &out.Selector
		*out = (*in).DeepCopy()
	}
	if in.Memory != nil {
		in, out := &in.Memory, &out.Memory
		*out = new(MemoryRef)
		**out = **in
	}
	if in.TTL != nil {
		in, out := &in.TTL, &out.TTL
		*out = new(Duration)
		**out = **in
	}
	if in.Timeout != nil {
		in, out := &in.Timeout, &out.Timeout
		*out = new(Duration)
		**out = **in
	}
	if in.Overrides != nil {
		in, out := &in.Overrides, &out.Overrides
		*out = make([]Override, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
}

func (in *QueryStatus) DeepCopyInto(out *QueryStatus) {
	*out = *in
	if in.Conditions != nil {
		in, out := &in.Conditions, &out.Conditions
		*out = make([]Condition, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
	if in.Response != nil {
		in, out := &in.Response, &out.Response
		*out = new(Response)
		(*in).DeepCopyInto(*out)
	}
	if in.Duration != nil {
		in, out := &in.Duration, &out.Duration
		*out = new(Duration)
		**out = **in
	}
}

func (in *Parameter) DeepCopyInto(out *Parameter) {
	*out = *in
	if in.ValueFrom != nil {
		in, out := &in.ValueFrom, &out.ValueFrom
		*out = new(ValueFromSource)
		(*in).DeepCopyInto(*out)
	}
}

func (in *ValueFromSource) DeepCopyInto(out *ValueFromSource) {
	*out = *in
	if in.SecretKeyRef != nil {
		in, out := &in.SecretKeyRef, &out.SecretKeyRef
		*out = new(SecretKeySelector)
		**out = **in
	}
	if in.ConfigMapKeyRef != nil {
		in, out := &in.ConfigMapKeyRef, &out.ConfigMapKeyRef
		*out = new(ConfigMapKeySelector)
		**out = **in
	}
	if in.QueryParameterRef != nil {
		in, out := &in.QueryParameterRef, &out.QueryParameterRef
		*out = new(QueryParameterRef)
		**out = **in
	}
}

func (in *Override) DeepCopyInto(out *Override) {
	*out = *in
	if in.Headers != nil {
		in, out := &in.Headers, &out.Headers
		*out = make([]Header, len(*in))
		for i := range *in {
			(*in)[i].DeepCopyInto(&(*out)[i])
		}
	}
	if in.LabelSelector != nil {
		in, out := &in.LabelSelector, &out.LabelSelector
		*out = (*in).DeepCopy()
	}
}

func (in *Header) DeepCopyInto(out *Header) {
	*out = *in
	in.Value.DeepCopyInto(&out.Value)
}

func (in *HeaderValue) DeepCopyInto(out *HeaderValue) {
	*out = *in
	if in.ValueFrom != nil {
		in, out := &in.ValueFrom, &out.ValueFrom
		*out = new(HeaderValueFrom)
		(*in).DeepCopyInto(*out)
	}
}

func (in *HeaderValueFrom) DeepCopyInto(out *HeaderValueFrom) {
	*out = *in
	if in.SecretKeyRef != nil {
		in, out := &in.SecretKeyRef, &out.SecretKeyRef
		*out = new(SecretKeySelector)
		**out = **in
	}
	if in.ConfigMapKeyRef != nil {
		in, out := &in.ConfigMapKeyRef, &out.ConfigMapKeyRef
		*out = new(ConfigMapKeySelector)
		**out = **in
	}
	if in.QueryParameterRef != nil {
		in, out := &in.QueryParameterRef, &out.QueryParameterRef
		*out = new(QueryParameterRef)
		**out = **in
	}
}

func (in *Response) DeepCopyInto(out *Response) {
	*out = *in
	if in.A2A != nil {
		in, out := &in.A2A, &out.A2A
		*out = new(A2AMetadata)
		**out = **in
	}
}

type Duration = metav1.Duration
type Condition = metav1.Condition
