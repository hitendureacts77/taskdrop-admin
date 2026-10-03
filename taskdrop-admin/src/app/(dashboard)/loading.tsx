export default function Loading() {
  return (
    <div className="loading" aria-busy="true" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      Loading the latest numbers…
    </div>
  );
}
