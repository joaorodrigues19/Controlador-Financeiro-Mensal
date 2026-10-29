import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Só deixa entrar no app com sessão ativa. */
export const authGuard: CanActivateFn = () => inject(AuthService).logado() || inject(Router).parseUrl('/entrar');

/** Quem já está logado não vê a tela de login. */
export const visitanteGuard: CanActivateFn = () => !inject(AuthService).logado() || inject(Router).parseUrl('/');
