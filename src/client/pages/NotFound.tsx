import { Link } from 'react-router-dom';
import { Flap } from '../components';

export default function NotFound() {
  return (
    <div className="center-page stack gap-20" style={{ textAlign: 'center', background: 'var(--ink)', color: '#fff' }}>
      <div style={{ width: 320 }}>
        <Flap value="404" height={110} size={76} />
      </div>
      <h1 className="display" style={{ fontSize: 44 }}>This number isn’t in line.</h1>
      <Link to="/" className="btn btn-yellow btn-lg">Back to the start</Link>
    </div>
  );
}
