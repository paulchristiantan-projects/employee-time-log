import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AuthService, Employee } from '../../services/auth.service';
import { TimeLogService, TimeLog, TimeEntry } from '../../services/time-log.service';
import { Observable, interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard" *ngIf="employee">
      <div class="dashboard-header" style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #fff; border-bottom: 1px solid #e0e0e0; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
        <div class="header-left" style="display: flex; align-items: center; gap: 15px; min-width: 0; flex: 1;">
          <div class="user-profile" style="display: flex; align-items: center; gap: 12px;">
            <div class="user-avatar" style="width: 48px; height: 48px; border-radius: 50%; background: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 18px; flex-shrink: 0;">{{ employee.name.charAt(0).toUpperCase() }}</div>
            <div class="user-info" style="min-width: 0;">
              <h1 style="margin: 0; font-size: clamp(16px, 4vw, 20px); font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ employee.name }}</h1>
              <p style="margin: 0; font-size: clamp(12px, 3vw, 14px); color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{ employee.position }} • {{ employee.employeeNumber }}</p>
            </div>
          </div>
        </div>
        
        <div class="header-center" style="order: 3; width: 100%; text-align: center;" 
             [style.order]="'window.innerWidth > 768 ? 0 : 3'"
             [style.width]="'window.innerWidth > 768 ? auto : 100%'">
          <div class="datetime-widget" style="text-align: center;">
            <div class="time-display" style="font-size: clamp(20px, 5vw, 24px); font-weight: 600; color: #1f2937;">{{ currentTime | date:'h:mm:ss a' }}</div>
            <div class="date-display" style="font-size: clamp(12px, 3vw, 14px); color: #6b7280;">{{ currentTime | date:'EEEE, MMM d' }}</div>
          </div>
        </div>
        
        <div class="header-right" style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
          <div class="time-tracker">
            <button 
              class="track-btn"
              [class.tracking]="isWorking"
              (click)="toggleTimeTracking()"
              style="padding: clamp(8px, 2vw, 12px) clamp(16px, 4vw, 24px); border: none; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; font-size: clamp(12px, 3vw, 14px); white-space: nowrap;"
              [style.background]="isWorking ? '#ef4444' : '#10b981'"
              [style.color]="'white'">
              <span class="track-indicator" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px;"
                [style.background]="isWorking ? '#fca5a5' : '#86efac'"></span>
              <span class="track-label">{{ isWorking ? 'Clock Out' : 'Clock In' }}</span>
            </button>
          </div>
          <button class="logout-btn" (click)="logout()" style="padding: clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px); border: 1px solid #d1d5db; background: white; border-radius: 6px; color: #6b7280; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: clamp(12px, 3vw, 14px); white-space: nowrap;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0;">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16,17 21,12 16,7"/>
              <line x1="21" x2="9" y1="12" y2="12"/>
            </svg>
            <span style="display: none;" [style.display]="'window.innerWidth > 480 ? inline : none'">Logout</span>
          </button>
        </div>
      </div>
      
      <!-- Mobile-specific time display -->
      <div style="display: none; padding: 16px; background: #f9fafb; border-radius: 8px; margin-bottom: 20px; text-align: center;" 
           [style.display]="'window.innerWidth <= 768 ? block : none'">
        <div style="font-size: 28px; font-weight: 600; color: #1f2937; margin-bottom: 4px;">{{ currentTime | date:'h:mm:ss a' }}</div>
        <div style="font-size: 14px; color: #6b7280;">{{ currentTime | date:'EEEE, MMMM d, y' }}</div>
      </div>

      <div class="content-grid" style="padding: 20px;">
        <div class="time-logs-section" style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #e5e7eb; max-height: 60vh; overflow-y: auto; position: relative;">
          <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
              </svg>
              <h2 style="margin: 0; color: #1f2937;">Time Logs</h2>
            </div>
            <div class="section-controls" style="display: flex; gap: 8px; align-items: center;">
              <div class="date-picker-wrapper">
                <input 
                  type="date" 
                  [value]="selectedDate" 
                  (change)="onDateChange($event)"
                  style="padding: 6px 12px; border: 1px solid #d1d5db; border-radius: 6px;"
                  placeholder="Select date">
              </div>
              <button *ngIf="selectedDate" (click)="clearDateFilter()" style="padding: 6px 12px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer;">
                Clear
              </button>
            </div>
          </div>
          
          <div class="date-logs" *ngFor="let dateGroup of getFilteredDateGroups(); trackBy: trackByDate" style="margin-bottom: 16px;">
            <div class="date-header" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-radius: 6px;">
              <div style="display: flex; align-items: center; gap: 16px;" (click)="toggleDate(dateGroup.date)" style="cursor: pointer; flex: 1;">
                <h3 style="margin: 0; color: #1f2937; font-size: 16px;">{{ formatDate(dateGroup.date) }}</h3>
                <span style="color: #6b7280; font-size: 14px;">Total: {{ getDayTotal(dateGroup.entries) }}</span>
              </div>
              <button (click)="toggleDate(dateGroup.date)" style="background: none; border: none; cursor: pointer; padding: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline [attr.points]="expandedDates.has(dateGroup.date) ? '6,9 12,15 18,9' : '9,18 15,12 9,6'"/>
                </svg>
              </button>
            </div>
            
            <div class="entries-container" *ngIf="expandedDates.has(dateGroup.date)" style="margin-top: 8px;">
              <div class="entry-card" *ngFor="let entry of dateGroup.entries; let i = index; trackBy: trackByEntry" style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin-bottom: 8px; background: white;">
                <div class="entry-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span style="font-weight: 600; color: #1f2937;">#{{ i + 1 }}</span>
                  <span [style.background]="entry.timeOut ? '#dcfce7' : '#fef3c7'" [style.color]="entry.timeOut ? '#166534' : '#92400e'" style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">{{ entry.timeOut ? 'Completed' : 'Active' }}</span>
                </div>
                <div class="entry-times" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                  <div class="time-item" style="text-align: center;">
                    <span style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Time In</span>
                    <span style="font-weight: 500; color: #1f2937;">{{ formatTime(entry.timeIn) }}</span>
                  </div>
                  <div class="time-item" style="text-align: center;">
                    <span style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Time Out</span>
                    <span style="font-weight: 500; color: #1f2937;">{{ entry.timeOut ? formatTime(entry.timeOut) : 'Active' }}</span>
                  </div>
                  <div class="time-item" style="text-align: center;">
                    <span style="display: block; font-size: 12px; color: #6b7280; margin-bottom: 4px;">Duration</span>
                    <span style="font-weight: 500; color: #1f2937;">{{ entry.duration !== undefined ? formatDuration(entry.duration) : getCurrentEntryDuration(entry) }}</span>
                  </div>
                </div>
              </div>
              
              <div class="no-entries" *ngIf="dateGroup.entries.length === 0" style="text-align: center; padding: 40px; color: #6b7280;">
                <p>No time entries for this date</p>
              </div>
            </div>
          </div>
          
          <div class="no-logs" *ngIf="getFilteredDateGroups().length === 0" style="text-align: center; padding: 60px; color: #6b7280;">
            <div style="margin-bottom: 16px;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto; display: block; opacity: 0.5;">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
                <line x1="16" x2="16" y1="2" y2="6"/>
                <line x1="8" x2="8" y1="2" y2="6"/>
                <line x1="3" x2="21" y1="10" y2="10"/>
                <path d="m9 16 2 2 4-4"/>
              </svg>
            </div>
            <h3 style="margin: 0 0 8px 0; color: #374151;">{{ selectedDate ? 'No Time Logs for Selected Date' : 'No Time Logs Yet' }}</h3>
            <p style="margin: 0;">{{ selectedDate ? 'Try selecting a different date' : 'Start tracking your time by clicking "Clock In"' }}</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit, OnDestroy {
  employee: Employee | null = null;
  todayLog: TimeLog | null = null;
  timeEntries: TimeEntry[] = [];
  entriesByDate: {[date: string]: TimeEntry[]} = {};
  expandedDates = new Set<string>();
  selectedDate: string = '';
  currentTime = new Date();
  isWorking = false;
  accumulatedHours = { today: 0, week: 0, month: 0 };
  
  // Add Object and Array to template context
  Object = Object;
  Array = Array;
  
  private timeSubscription?: Subscription;
  private logSubscription?: Subscription;
  private entriesSubscription?: Subscription;
  private hoursSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private timeLogService: TimeLogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Ensure clean state
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
    
    // Single timer subscription
    this.timeSubscription = interval(1000).subscribe(() => {
      this.currentTime = new Date();
    });

    this.authService.user$.subscribe(user => {
      if (user) {
        this.authService.getEmployeeData(user.uid).subscribe(employee => {
          this.employee = employee || null;
          if (employee) {
            if (employee.role === 'admin') {
              window.location.href = '/admin';
              return;
            }
            this.loadTimeLog(user.uid);
            this.loadTimeEntries(user.uid);
            this.loadAccumulatedHours(user.uid);
          }
        });
      }
    });
  }

  ngOnDestroy() {
    if (this.timeSubscription) {
      this.timeSubscription.unsubscribe();
    }
    if (this.logSubscription) {
      this.logSubscription.unsubscribe();
    }
    if (this.entriesSubscription) {
      this.entriesSubscription.unsubscribe();
    }
    if (this.hoursSubscription) {
      this.hoursSubscription.unsubscribe();
    }
  }

  loadTimeLog(employeeId: string) {
    this.logSubscription = this.timeLogService.getTodayTimeLog(employeeId).subscribe(log => {
      this.todayLog = log || null;
      this.isWorking = !!(log?.timeIn && !log?.timeOut);
    });
  }

  loadTimeEntries(employeeId: string) {
    this.entriesSubscription = this.timeLogService.getTimeEntries(employeeId).subscribe(entries => {
      const grouped: {[date: string]: TimeEntry[]} = {};
      entries.forEach(entry => {
        const date = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
        const dateStr = date.toISOString().split('T')[0];
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(entry);
      });
      
      // Only update if data actually changed
      const newKeys = Object.keys(grouped).sort().join(',');
      const oldKeys = Object.keys(this.entriesByDate).sort().join(',');
      
      if (newKeys !== oldKeys || JSON.stringify(grouped) !== JSON.stringify(this.entriesByDate)) {
        this.entriesByDate = grouped;
        const today = new Date().toISOString().split('T')[0];
        this.expandedDates.add(today);
      }
    });
  }

  loadAccumulatedHours(employeeId: string) {
    this.hoursSubscription = this.timeLogService.getAccumulatedHours(employeeId).subscribe(hours => {
      this.accumulatedHours = hours;
    });
  }

  onDateChange(event: any) {
    this.selectedDate = event.target.value;
    if (this.selectedDate) {
      this.expandedDates.clear();
      this.expandedDates.add(this.selectedDate);
    }
  }

  clearDateFilter() {
    this.selectedDate = '';
    this.expandedDates.clear();
    const today = new Date().toISOString().split('T')[0];
    this.expandedDates.add(today);
  }

  getDateGroups() {
    return Object.keys(this.entriesByDate)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({ date, entries: this.entriesByDate[date] }));
  }

  getFilteredDateGroups() {
    const allGroups = this.getDateGroups();
    if (this.selectedDate) {
      return allGroups.filter(group => group.date === this.selectedDate);
    }
    return allGroups;
  }

  toggleDate(date: string) {
    if (this.expandedDates.has(date)) {
      this.expandedDates.delete(date);
    } else {
      this.expandedDates.add(date);
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  getDayTotal(entries: TimeEntry[]): string {
    let totalSeconds = 0;
    
    entries.forEach(entry => {
      if (entry.timeOut && entry.duration !== undefined) {
        // Completed entry - use stored duration
        totalSeconds += entry.duration;
      } else if (!entry.timeOut && this.isWorking) {
        // Only calculate active duration if currently working
        const timeIn = entry.timeIn.toDate ? entry.timeIn.toDate() : new Date(entry.timeIn);
        const now = new Date();
        const currentDuration = Math.floor((now.getTime() - timeIn.getTime()) / 1000);
        totalSeconds += Math.max(0, currentDuration);
      }
    });
    
    return this.formatDuration(totalSeconds);
  }

  formatTime(timestamp: any): string {
    if (!timestamp) return '--';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatDuration(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getCurrentSessionTime(): string {
    if (!this.isWorking || !this.todayLog?.timeIn || this.todayLog?.timeOut) return '0h 0m 0s';
    const timeIn = this.todayLog.timeIn.toDate ? this.todayLog.timeIn.toDate() : new Date(this.todayLog.timeIn);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - timeIn.getTime()) / 1000);
    return this.formatDuration(diffSeconds);
  }

  getCurrentEntryDuration(entry: TimeEntry): string {
    if (entry.timeOut) return '--';
    const timeIn = entry.timeIn.toDate ? entry.timeIn.toDate() : new Date(entry.timeIn);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - timeIn.getTime()) / 1000);
    return this.formatDuration(Math.max(0, diffSeconds));
  }

  getTotalTodaySeconds(): number {
    let totalSeconds = 0;
    const today = new Date().toISOString().split('T')[0];
    
    if (this.entriesByDate[today]) {
      this.entriesByDate[today].forEach(entry => {
        if (entry.duration !== undefined) {
          totalSeconds += entry.duration;
        } else if (!entry.timeOut && this.isWorking) {
          const timeIn = entry.timeIn.toDate ? entry.timeIn.toDate() : new Date(entry.timeIn);
          const now = new Date();
          totalSeconds += Math.floor((now.getTime() - timeIn.getTime()) / 1000);
        }
      });
    }
    
    return totalSeconds;
  }

  getTimeInDisplay(): string {
    if (!this.todayLog?.timeIn) return '--';
    const timeIn = this.todayLog.timeIn.toDate ? this.todayLog.timeIn.toDate() : new Date(this.todayLog.timeIn);
    return timeIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  async timeIn() {
    if (this.employee) {
      try {
        await this.timeLogService.timeIn(this.employee.uid);
      } catch (error) {
        console.error('Clock in failed:', error);
      }
    }
  }

  async timeOut() {
    if (this.employee) {
      try {
        await this.timeLogService.timeOut(this.employee.uid);
      } catch (error) {
        console.error('Clock out failed:', error);
      }
    }
  }

  async toggleTimeTracking() {
    if (this.isWorking) {
      await this.timeOut();
    } else {
      await this.timeIn();
    }
  }

  logout() {
    this.authService.logout();
  }

  hasLogsForDate(date: string): boolean {
    return !!this.entriesByDate[date];
  }

  trackByDate(index: number, item: any): string {
    return item.date;
  }

  trackByEntry(index: number, item: any): string {
    return item.id || index;
  }
}