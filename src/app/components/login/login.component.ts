import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="form-container">
      <h2>Employee Login</h2>
      <form [formGroup]="loginForm" (ngSubmit)="onLogin()">
        <div class="form-group">
          <input type="text" formControlName="employeeNumber" placeholder="Employee Number" required>
        </div>
        <div class="form-group">
          <input type="password" formControlName="password" placeholder="Password" required>
        </div>
        <button type="submit" [disabled]="loginForm.invalid">Login</button>
        <div *ngIf="error" style="color: red; margin-top: 10px;">{{ error }}</div>
      </form>
      <p style="margin-top: 20px;">
        Don't have an account? <a routerLink="/register">Register here</a>
      </p>
    </div>
  `
})
export class LoginComponent {
  loginForm: FormGroup;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      employeeNumber: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  async onLogin() {
    if (this.loginForm.valid) {
      try {
        const { employeeNumber, password } = this.loginForm.value;
        await this.authService.login(employeeNumber, password);
      } catch (error: any) {
        this.error = 'Invalid employee number or password';
      }
    }
  }
}