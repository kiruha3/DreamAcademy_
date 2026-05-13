import { ref, watch, type Ref } from "vue";

export function useDebounce<T>(valueRef: Ref<T>, delay = 300): Ref<T> {
  const debouncedValue = ref(valueRef.value) as Ref<T>;
  let timer: ReturnType<typeof setTimeout>;

  watch(
    valueRef,
    (newVal) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        debouncedValue.value = newVal;
      }, delay);
    },
    { immediate: false }
  );

  return debouncedValue;
}
