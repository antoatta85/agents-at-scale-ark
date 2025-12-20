// Create query string helper
export const createQueryString = (
  updates: Record<string, string | undefined>,
  searchParams: URLSearchParams,
) => {
  const params = new URLSearchParams(searchParams.toString());

  Object.entries(updates).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
  });

  return params.toString();
};
