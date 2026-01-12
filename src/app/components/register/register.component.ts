import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  template: `
    <div class="form-container">
      <h2>Employee Registration</h2>
      <form [formGroup]="registerForm" (ngSubmit)="onRegister()">
        <div class="form-group">
          <input type="text" formControlName="name" placeholder="Full Name" required>
        </div>
        <div class="form-group">
          <input type="text" formControlName="position" placeholder="Position" required>
        </div>
        <div class="form-group">
          <input type="text" formControlName="employeeNumber" placeholder="Employee Number" required>
        </div>
        <div class="form-group">
          <input type="password" formControlName="password" placeholder="Password" required>
        </div>
        <button type="submit" [disabled]="registerForm.invalid">Register</button>
        <div *ngIf="error" style="color: red; margin-top: 10px;">{{ error }}</div>
      </form>
      <p style="margin-top: 20px;">
        Already have an account? <a routerLink="/login">Login here</a>
      </p>
    </div>
  `
})
export class RegisterComponent {
  registerForm: FormGroup;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      position: ['', Validators.required],
      employeeNumber: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async onRegister() {
    if (this.registerForm.valid) {
      try {
        const { name, position, employeeNumber, password } = this.registerForm.value;
        await this.authService.register(name, position, employeeNumber, password);
      } catch (error: any) {
        this.error = error.message || 'Registration failed';
      }
    }
  }
}