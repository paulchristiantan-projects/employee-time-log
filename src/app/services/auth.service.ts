import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Employee {
  uid: string;
  name: string;
  position: string;
  employeeNumber: string;
  role?: 'employee' | 'admin';
}

@Injectable()
export class AuthService {
  user$: Observable<any>;

  constructor(
    private afAuth: AngularFireAuth,
    private firestore: AngularFirestore,
    private router: Router
  ) {
    this.user$ = this.afAuth.authState;
  }

  async register(name: string, position: string, employeeNumber: string, password: string) {
    try {
      const email = `${employeeNumber}@company.com`;
      const credential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      
      if (credential.user) {
        await this.firestore.collection('employees').doc(credential.user.uid).set({
          uid: credential.user.uid,
          name,
          position,
          employeeNumber,
          role: 'employee'
        });
        
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      throw error;
    }
  }

  async login(employeeNumber: string, password: string) {
    try {
      const email = `${employeeNumber}@company.com`;
      const result = await this.afAuth.signInWithEmailAndPassword(email, password);
      
      if (result.user) {
        // Check user role and redirect accordingly
        const userData = await this.firestore.collection('employees').doc(result.user.uid).get().toPromise();
        const employee = userData?.data() as Employee;
        
        // If no employee data found and this is admin credentials, create admin document
        if (!employee && employeeNumber === environment.admin.employeeNumber) {
          await this.firestore.collection('employees').doc(result.user.uid).set({
            uid: result.user.uid,
            name: 'System Administrator',
            position: 'Administrator',
            employeeNumber: environment.admin.employeeNumber,
            role: 'admin'
          });
          window.location.href = '/admin';
          return;
        }
        
        if (employee?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          this.router.navigate(['/dashboard']);
        }
      }
    } catch (error: any) {
      // If admin credentials and account doesn't exist, create it
      if (error.code === 'auth/user-not-found' && 
          employeeNumber === environment.admin.employeeNumber && 
          password === environment.admin.password) {
        await this.ensureAdminExists();
        // Try login again
        const email = `${employeeNumber}@company.com`;
        const result = await this.afAuth.signInWithEmailAndPassword(email, password);
        if (result.user) {
          window.location.href = '/admin';
        }
      } else {
        throw error;
      }
    }
  }

  async logout() {
    await this.afAuth.signOut();
    this.router.navigate(['/login']);
  }

  getEmployeeData(uid: string): Observable<Employee | undefined> {
    return this.firestore.collection('employees').doc<Employee>(uid).valueChanges();
  }

  getAllEmployees(): Observable<Employee[]> {
    return this.firestore.collection<Employee>('employees').valueChanges();
  }

  private async ensureAdminExists() {
    try {
      const adminEmail = `${environment.admin.employeeNumber}@company.com`;
      const adminPassword = environment.admin.password;
      
      // Try to create admin account
      const credential = await this.afAuth.createUserWithEmailAndPassword(adminEmail, adminPassword);
      
      if (credential.user) {
        // Create admin document in Firestore
        await this.firestore.collection('employees').doc(credential.user.uid).set({
          uid: credential.user.uid,
          name: 'System Administrator',
          position: 'Administrator',
          employeeNumber: environment.admin.employeeNumber,
          role: 'admin'
        });
      }
    } catch (error: any) {
      // Admin account already exists, ignore error
      if (error.code !== 'auth/email-already-in-use') {
        console.error('Error creating admin account:', error);
      }
    }
  }
}