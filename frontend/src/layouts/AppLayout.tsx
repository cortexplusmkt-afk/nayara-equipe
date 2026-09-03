import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function AppLayout() {
  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}