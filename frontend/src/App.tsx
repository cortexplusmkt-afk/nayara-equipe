import {
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import AppLayout
  from './layouts/AppLayout';

import Login
  from './pages/Login';

import Dashboard
  from './pages/Dashboard';

import Cadastros
  from './pages/Cadastros';

import NovoCadastro
  from './pages/NovoCadastro';

import ConferenciaCadastro
  from './pages/ConferenciaCadastro';

import FinalizarCadastro
  from './pages/FinalizarCadastro';

import CadastroConcluido
  from './pages/CadastroConcluido';

import Mapa
  from './pages/Mapa';

import TerritorioEleitoral
  from './pages/TerritorioEleitoral';

import Documentos
  from './pages/Documentos';

import Configuracoes
  from './pages/Configuracoes';

import DetalheCadastro
  from './pages/DetalheCadastro';

import {
  AuthProvider,
} from './auth/AuthContext';

import RequireAuth
  from './auth/RequireAuth';

import RequireRole
  from './auth/RequireRole';

export default function App() {
  return (
    <AuthProvider>
      <Routes>

        <Route
          path="/login"
          element={
            <Login />
          }
        />

        <Route
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >

          <Route
            path="/"
            element={
              <Dashboard />
            }
          />

          <Route
            path="/cadastros"
            element={
              <Cadastros />
            }
          />

          <Route
            path="/cadastros/novo"
            element={
              <RequireRole
                roles={[
                  'ADMIN',
                  'OPERATOR',
                ]}
              >
                <NovoCadastro />
              </RequireRole>
            }
          />

          <Route
            path="/cadastros/:uploadId/conferencia"
            element={
              <RequireRole
                roles={[
                  'ADMIN',
                  'OPERATOR',
                ]}
              >
                <ConferenciaCadastro />
              </RequireRole>
            }
          />

          <Route
            path="/cadastros/:uploadId/finalizar"
            element={
              <RequireRole
                roles={[
                  'ADMIN',
                  'OPERATOR',
                ]}
              >
                <FinalizarCadastro />
              </RequireRole>
            }
          />

          <Route
            path="/cadastros/concluido/:cadastroId"
            element={
              <RequireRole
                roles={[
                  'ADMIN',
                  'OPERATOR',
                ]}
              >
                <CadastroConcluido />
              </RequireRole>
            }
          />

          <Route
            path="/mapa"
            element={
              <Mapa />
            }
          />

          <Route
            path="/territorio-eleitoral"
            element={
              <TerritorioEleitoral />
            }
          />

          <Route
            path="/cadastros/:cadastroId"
            element={
              <DetalheCadastro />
            }
          />

          <Route
            path="/documentos"
            element={
              <RequireRole
                roles={[
                  'ADMIN',
                  'OPERATOR',
                ]}
              >
                <Documentos />
              </RequireRole>
            }
          />

          <Route
            path="/configuracoes"
            element={
              <RequireRole
                roles={[
                  'ADMIN',
                ]}
              >
                <Configuracoes />
              </RequireRole>
            }
          />

        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>
    </AuthProvider>
  );
}
