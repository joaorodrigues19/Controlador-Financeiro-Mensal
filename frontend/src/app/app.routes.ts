import { Routes } from '@angular/router';
import { authGuard, visitanteGuard } from './core/auth/auth.guards';
import { Shell } from './layout/shell';
import { Lancamentos } from './pages/lancamentos';
import { Login } from './pages/login';
import { Painel } from './pages/painel';
import { VisaoGeral } from './pages/visao-geral';

export const routes: Routes = [
  { path: 'entrar', component: Login, canActivate: [visitanteGuard], title: 'Entrar · Controle Financeiro' },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'visao-geral' },
      { path: 'visao-geral', component: VisaoGeral, title: 'Visão geral · Controle Financeiro' },
      { path: 'painel', component: Painel, title: 'Painel · Controle Financeiro' },
      { path: 'lancamentos', component: Lancamentos, title: 'Lançamentos · Controle Financeiro' },
    ],
  },
  { path: '**', redirectTo: '' },
];
