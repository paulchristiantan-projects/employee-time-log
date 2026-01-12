import { Component, OnInit } from '@angular/core';
import { AuthService, Employee } from '../../services/auth.service';
import { TimeLogService, TimeEntry } from '../../services/time-log.service';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-admin',
  template: `
    <div class="admin-dashboard" style="min-height: 100vh; background: #f5f5f5; padding: 20px;">
      <div class="admin-header" style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #fff; border-bottom: 1px solid #e0e0e0; margin-bottom: 20px; border-radius: 8px;">
        <div>
          <h1 style="margin: 0; color: #1f2937;">Admin Dashboard</h1>
          <p style="margin: 0; color: #6b7280;">Employee Time Tracking Overview</p>
        </div>
        <div style="display: flex; gap: 12px; align-items: center;">
          <button (click)="exportToExcel()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;">
            Export Excel
          </button>
          <button (click)="logout()" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; color: #6b7280; cursor: pointer;">
            Logout
          </button>
        </div>
      </div>

      <div class="employee-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px;">
        <div *ngFor="let employee of (employees$ | async)" 
             style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">
              {{ employee.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 style="margin: 0; font-size: 16px; color: #1f2937;">{{ employee.name }}</h3>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">{{ employee.position }} • {{ employee.employeeNumber }}</p>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="text-align: center; padding: 12px; background: #f9fafb; border-radius: 6px;">
              <div style="font-size: 18px; font-weight: 600; color: #1f2937;">{{ getTodayHours(employee.uid) }}</div>
              <div style="font-size: 12px; color: #6b7280;">Today</div>
            </div>
            <div style="text-align: center; padding: 12px; background: #f9fafb; border-radius: 6px;">
              <div style="font-size: 18px; font-weight: 600; color: #1f2937;">{{ getWeekHours(employee.uid) }}</div>
              <div style="font-size: 12px; color: #6b7280;">This Week</div>
            </div>
          </div>
          
          <div style="margin-top: 12px; text-align: center;">
            <button (click)="viewEmployeeDetails(employee.uid, employee.name)" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; margin-right: 8px;">
              View Details
            </button>
            <span style="padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; background: #f3f4f6; color: #6b7280;">
              Inactive
            </span>
          </div>
        </div>
      </div>
      
      <!-- Employee Details Modal -->
      <div *ngIf="selectedEmployee" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; border-radius: 8px; padding: 20px; max-width: 800px; width: 90%; max-height: 80%; overflow-y: auto;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #1f2937;">{{ selectedEmployeeName }} - Time Logs</h2>
            <button (click)="closeEmployeeDetails()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
          </div>
          
          <div *ngFor="let dateGroup of selectedEmployeeEntries" style="margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background: #f9fafb; padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <h3 style="margin: 0; color: #1f2937;">{{ formatDateHeader(dateGroup.date) }}</h3>
              <span style="color: #6b7280; font-size: 14px;">Total: {{ calculateDayTotal(dateGroup.entries) }}</span>
            </div>
            
            <div style="padding: 16px;">
              <div *ngFor="let entry of dateGroup.entries; let i = index" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
                <div>
                  <span style="font-weight: 500; color: #1f2937;">#{{ i + 1 }}</span>
                  <span style="margin-left: 12px; color: #6b7280;">{{ formatTime(entry.timeIn) }} - {{ entry.timeOut ? formatTime(entry.timeOut) : 'Active' }}</span>
                </div>
                <div style="font-weight: 500; color: #1f2937;">
                  {{ entry.duration ? formatDuration(entry.duration) : 'Active' }}
                </div>
              </div>
            </div>
          </div>
          
          <div *ngIf="selectedEmployeeEntries.length === 0" style="text-align: center; padding: 40px; color: #6b7280;">
            No time entries found for this employee.
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminComponent implements OnInit {
  employees$!: Observable<Employee[]>;
  recentEntries$!: Observable<TimeEntry[]>;
  employeeHours: {[key: string]: {today: number, week: number}} = {};
  employeeNames: {[key: string]: string} = {};
  activeEmployees: Set<string> = new Set();
  
  // Employee details modal
  selectedEmployee: string | null = null;
  selectedEmployeeName: string = '';
  selectedEmployeeEntries: {date: string, entries: TimeEntry[]}[] = [];

  constructor(
    private authService: AuthService,
    private timeLogService: TimeLogService
  ) {}

  ngOnInit() {
    // Load employees (filter out admin)
    this.employees$ = this.authService.getAllEmployees().pipe(
      map(employees => employees.filter(emp => emp.role !== 'admin'))
    );
    
    // Load time entries
    this.recentEntries$ = this.timeLogService.getAllTimeEntries();
    
    // Load employee hours data
    this.employees$.subscribe(employees => {
      employees.forEach(emp => {
        this.employeeNames[emp.uid] = emp.name;
        this.timeLogService.getAccumulatedHours(emp.uid).subscribe(hours => {
          this.employeeHours[emp.uid] = hours;
        });
      });
    });
  }

  getTodayHours(employeeId: string): string {
    const hours = this.employeeHours[employeeId]?.today || 0;
    return this.formatHours(hours);
  }

  getWeekHours(employeeId: string): string {
    const hours = this.employeeHours[employeeId]?.week || 0;
    return this.formatHours(hours);
  }

  formatHours(totalHours: number): string {
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours % 1) * 60);
    const seconds = Math.floor(((totalHours % 1) * 60 % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  viewEmployeeDetails(employeeId: string, employeeName: string) {
    this.selectedEmployee = employeeId;
    this.selectedEmployeeName = employeeName;
    
    // Load employee's time entries grouped by date
    this.timeLogService.getEntriesByDate(employeeId).subscribe(grouped => {
      this.selectedEmployeeEntries = Object.keys(grouped)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        .map(date => ({ date, entries: grouped[date] }));
    });
  }

  closeEmployeeDetails() {
    this.selectedEmployee = null;
    this.selectedEmployeeName = '';
    this.selectedEmployeeEntries = [];
  }

  formatDateHeader(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  }

  calculateDayTotal(entries: TimeEntry[]): string {
    let totalSeconds = 0;
    entries.forEach(entry => {
      if (entry.duration !== undefined) {
        totalSeconds += entry.duration;
      }
    });
    return this.formatDuration(totalSeconds);
  }

  isEmployeeWorking(employeeId: string): boolean {
    return this.activeEmployees.has(employeeId);
  }

  getEmployeeName(employeeId: string): string {
    return this.employeeNames[employeeId] || 'Unknown Employee';
  }

  formatTime(timestamp: any): string {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatDate(timestamp: any): string {
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  logout() {
    this.authService.logout();
  }

  exportToExcel() {
    const exportData: any[] = [];
    
    // Get current data synchronously
    this.employees$.subscribe(employees => {
      employees.forEach(employee => {
        const todayHours = this.getTodayHours(employee.uid);
        const weekHours = this.getWeekHours(employee.uid);
        const status = this.isEmployeeWorking(employee.uid) ? 'Active' : 'Inactive';
        
        exportData.push({
          'Employee Name': employee.name,
          'Position': employee.position,
          'Employee Number': employee.employeeNumber,
          'Today Hours': todayHours,
          'Week Hours': weekHours,
          'Status': status,
          'Export Date': new Date().toLocaleDateString()
        });
      });
      
      this.downloadCSV(exportData);
    });
  }

  private downloadCSV(data: any[]) {
    if (data.length === 0) {
      alert('No data to export');
      return;
    }

    // Convert to CSV
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `employee-timelog-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}