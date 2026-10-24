export type FieldsErrors<T> = Partial<Record<keyof T, string[]>>;

export type ActionState<TInput, TOutput> = {
  fieldErrors?: FieldsErrors<TInput>;
  error?: string;
  code?: string;
  status?: number;
  data?: TOutput;
};
