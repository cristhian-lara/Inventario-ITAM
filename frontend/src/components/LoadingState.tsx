import './LoadingState.css';

interface LoadingStateProps {
  message?: string;
  inline?: boolean;
}

export default function LoadingState({ message = 'Cargando...', inline = false }: LoadingStateProps) {
  if (inline) {
    return (
      <span className="loading-state-inline">
        <span className="spinner spinner-inline"></span>
        {message}
      </span>
    );
  }

  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p className="title-glow">{message}</p>
    </div>
  );
}
