import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TimeLog {
  id?: string;
  employeeId: string;
  date: string;
  timeIn?: any;
  timeOut?: any;
  totalHours?: number;
}

export interface TimeEntry {
  id?: string;
  employeeId: string;
  timeIn: any;
  timeOut?: any;
  duration?: number;
  timestamp: any;
}

@Injectable()
export class TimeLogService {
  constructor(private firestore: AngularFirestore) {}

  async timeIn(employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const timeLogRef = this.firestore.collection('timeLogs').doc(`${employeeId}_${today}`);
    
    // Add to time entries collection with unique ID
    const entryId = `${employeeId}_${Date.now()}`;
    
    try {
      await this.firestore.collection('timeEntries').doc(entryId).set({
        employeeId,
        timeIn: new Date(),
        timestamp: new Date()
      });
      
      // Get existing data to preserve total hours
      const existingDoc = await timeLogRef.get().toPromise();
      const existingTotal = existingDoc?.exists ? (existingDoc.data() as any)?.totalHours || 0 : 0;
      
      await timeLogRef.set({
        employeeId,
        date: today,
        timeIn: new Date(),
        timeOut: null,
        totalHours: existingTotal,
        currentEntryId: entryId
      });
    } catch (error) {
      console.error('Error in timeIn:', error);
      throw error;
    }
  }

  async timeOut(employeeId: string) {
    const today = new Date().toISOString().split('T')[0];
    const timeLogRef = this.firestore.collection('timeLogs').doc(`${employeeId}_${today}`);
    
    const doc = await timeLogRef.get().toPromise();
    if (doc?.exists) {
      const data = doc.data() as any;
      const timeOut = new Date();
      
      // Get the actual entry to get the correct timeIn
      if (data.currentEntryId) {
        try {
          const entryDoc = await this.firestore.collection('timeEntries').doc(data.currentEntryId).get().toPromise();
          if (entryDoc?.exists) {
            const entryData = entryDoc.data() as TimeEntry;
            const timeIn = entryData.timeIn?.toDate ? entryData.timeIn.toDate() : new Date(entryData.timeIn);
            const sessionHours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
            
            console.log('TimeIn:', timeIn, 'TimeOut:', timeOut, 'Duration hours:', sessionHours);
            
            // Update the entry with timeOut and duration (in seconds)
            const sessionSeconds = Math.floor((timeOut.getTime() - timeIn.getTime()) / 1000);
            await this.firestore.collection('timeEntries').doc(data.currentEntryId).update({
              timeOut: timeOut,
              duration: sessionSeconds
            });
            
            // Add current session to existing total hours
            const previousTotal = data.totalHours || 0;
            const newTotalHours = previousTotal + sessionHours;
            
            await timeLogRef.update({
              timeOut: timeOut,
              totalHours: Math.round(newTotalHours * 100) / 100,
              currentEntryId: null
            });
            
            console.log('Updated entry:', data.currentEntryId, 'with duration:', sessionSeconds, 'seconds');
          }
        } catch (error) {
          console.error('Error updating time entry:', error);
        }
      }
    }
  }

  getTodayTimeLog(employeeId: string): Observable<TimeLog | undefined> {
    const today = new Date().toISOString().split('T')[0];
    return this.firestore.collection('timeLogs').doc<TimeLog>(`${employeeId}_${today}`).valueChanges();
  }

  getTimeEntries(employeeId: string): Observable<TimeEntry[]> {
    return this.firestore.collection<TimeEntry>('timeEntries').valueChanges({ idField: 'id' }).pipe(
      map(entries => {
        const filtered = entries
          .filter(entry => entry.employeeId === employeeId)
          .sort((a, b) => {
            const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
            const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
            return timeB.getTime() - timeA.getTime();
          })
          .slice(0, 50);
        return filtered;
      })
    );
  }

  getEntriesByDate(employeeId: string): Observable<{[date: string]: TimeEntry[]}> {
    return this.getTimeEntries(employeeId).pipe(
      map(entries => {
        const grouped: {[date: string]: TimeEntry[]} = {};
        entries.forEach(entry => {
          const date = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
          const dateStr = date.toISOString().split('T')[0];
          if (!grouped[dateStr]) grouped[dateStr] = [];
          grouped[dateStr].push(entry);
        });
        return grouped;
      })
    );
  }

  getAccumulatedHours(employeeId: string): Observable<{today: number, week: number, month: number}> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Use timeEntries instead of timeLogs for accurate calculation
    return this.getTimeEntries(employeeId).pipe(
      map((entries: TimeEntry[]) => {
        let todaySeconds = 0;
        let weekSeconds = 0;
        let monthSeconds = 0;
        
        entries.forEach(entry => {
          const entryDate = entry.timestamp?.toDate ? entry.timestamp.toDate() : new Date(entry.timestamp);
          const entryDateStr = entryDate.toISOString().split('T')[0];
          
          // Calculate duration for this entry
          let duration = 0;
          if (entry.duration !== undefined) {
            duration = entry.duration; // in seconds
          } else if (!entry.timeOut) {
            // Active entry - calculate current duration
            const timeIn = entry.timeIn?.toDate ? entry.timeIn.toDate() : new Date(entry.timeIn);
            const now = new Date();
            duration = Math.floor((now.getTime() - timeIn.getTime()) / 1000);
          }
          
          // Add to appropriate totals
          if (entryDateStr === todayStr) {
            todaySeconds += duration;
          }
          if (entryDate >= startOfWeek) {
            weekSeconds += duration;
          }
          if (entryDate >= startOfMonth) {
            monthSeconds += duration;
          }
        });
        
        // Convert seconds to hours
        const result = {
          today: todaySeconds / 3600,
          week: weekSeconds / 3600,
          month: monthSeconds / 3600
        };
        
        return result;
      })
    );
  }

  // Admin methods
  getAllTimeEntries(): Observable<TimeEntry[]> {
    return this.firestore.collection<TimeEntry>('timeEntries').valueChanges({ idField: 'id' }).pipe(
      map(entries => entries.sort((a, b) => {
        const timeA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const timeB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return timeB.getTime() - timeA.getTime();
      }))
    );
  }

  getAllTimeLogs(): Observable<TimeLog[]> {
    return this.firestore.collection<TimeLog>('timeLogs').valueChanges({ idField: 'id' });
  }
}