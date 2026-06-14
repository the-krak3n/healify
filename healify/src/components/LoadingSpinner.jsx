export default function LoadingSpinner({ text = 'Processing...', color = 'var(--primary)' }) {
  return (
    <div className="loader-wrap">
      <div className="loader" style={{ borderTopColor: color }} />
      <div className="loader-text">{text}</div>
    </div>
  );
}
