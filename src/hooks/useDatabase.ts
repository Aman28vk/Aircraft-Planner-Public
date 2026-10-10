import { useState, useEffect } from 'react';
import { db } from '../services/storage';

/**
 * React hook that subscribes to storage mutations and provides
 * reactive database state to components.
 */
export function useDatabase() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    // Subscribe to all changes in db
    const unsubscribe = db.subscribe(() => {
      setVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  return {
    currentUser: db.getCurrentUser(),
    setCurrentUser: (id: string | null) => db.setCurrentUser(id),
    companies: db.getCompanies(),
    companyInvitations: db.getCompanyInvitations(),
    profiles: db.getProfiles(),
    allProfiles: db.getAllProfiles(),
    teams: db.getTeams(),
    stages: db.getStages(),
    aircraftList: db.getAircraftList(),
    tasks: db.getTasks(),
    projectBuckets: db.getProjectBuckets(),
    notifications: db.getNotifications(),
    unreadNotificationsCount: db.getNotifications().filter((n) => n.status === 'UNREAD').length,
    emailLogs: db.getEmailLogs(),
    activityLogs: db.getActivityLogs(),
    auditLogs: db.getAuditLogs(),
    templates: db.getTemplates(),
    lifecycleTemplates: db.getLifecycleTemplates(),
    // Company filtering & tenant context
    selectedCompanyFilter: db.getSelectedCompanyFilter(),
    setSelectedCompanyFilter: (companyId: string) => db.setSelectedCompanyFilter(companyId),
    activeUserCompanyId: db.getUserCompanyId(db.getCurrentUser()),
    activeUserCompany: db.getCompanyById(db.getUserCompanyId(db.getCurrentUser())),
    // Auth & Company helpers
    login: (email: string, password?: string) => db.login(email, password),
    register: (data: { email: string; full_name: string; password?: string; job_title?: string; department?: string }) =>
      db.register(data),
    sendRegistrationOtp: (email: string, fullName?: string) => db.sendRegistrationOtp(email, fullName),
    logout: () => db.logout(),
    verifySessionFromSupabase: (userId?: string) => db.verifySessionFromSupabase(userId),
    validateCompanyAccess: (email: string) => db.validateCompanyAccess(email),
    createCompany: (data: {
      name: string;
      email_domain: string;
      status?: any;
      onboarding_date?: string;
      expiry_date?: string;
      plan_tier?: any;
      max_seats?: number;
      contact_person?: string;
      contact_email?: string;
      notes?: string;
    }) => db.createCompany(data),
    updateCompany: (id: string, updates: any) => db.updateCompany(id, updates),
    renewCompanyContract: (id: string, additionalYears?: number) => db.renewCompanyContract(id, additionalYears),
    deleteCompany: (id: string) => db.deleteCompany(id),
    updateUserStatus: (userId: string, status: any) => db.updateUserStatus(userId, status),
    inviteEmployee: (data: { email: string; full_name?: string; password?: string; job_title?: string; department?: string }) =>
      db.inviteEmployee(data),
    addEmployeeByColleague: (data: {
      full_name: string;
      email: string;
      password?: string;
      job_title?: string;
      department?: string;
      phone?: string;
    }) => db.addEmployeeByColleague(data),
    setCompanyAdmin: (userId: string, makeAdmin: boolean) => db.setCompanyAdmin(userId, makeAdmin),
    setUserPassword: (userId: string, newPassword: string) => db.setUserPassword(userId, newPassword),
    changeMyPassword: (newPassword: string, currentPassword?: string) => db.changeMyPassword(newPassword, currentPassword),
    resetPasswordWithOtp: (email: string, otp: string, newPassword: string) => db.resetPasswordWithOtp(email, otp, newPassword),
    removeUser: (userId: string) => db.deleteProfile(userId),
    assignTask: (taskId: string, userId?: string) => db.assignTask(taskId, userId),
    reorderTasks: (updates: any[]) => db.reorderTasks(updates),
    createTeam: (team: any) => db.createTeam(team),
    updateTeam: (id: string, updates: any) => db.updateTeam(id, updates),
    deleteTeam: (id: string) => db.deleteTeam(id),
    getTeamsForAircraft: (aircraftId?: string) => db.getTeams(aircraftId),
    deleteAircraft: (id: string) => db.deleteAircraft(id),
    addChecklistItem: (taskId: string, title: string, attachmentUrl?: string, attachmentName?: string, attachmentType?: string) =>
      db.addChecklistItem(taskId, title, attachmentUrl, attachmentName, attachmentType),
    updateChecklistItem: (id: string, updates: any) => db.updateChecklistItem(id, updates),
    renameChecklistItem: (id: string, newTitle: string) => db.updateChecklistItem(id, { title: newTitle }),
    toggleChecklistItem: (id: string) => db.toggleChecklistItem(id),
    deleteChecklistItem: (id: string) => db.deleteChecklistItem(id),
    addAttachment: (
      taskId: string,
      aircraftId: string,
      fileName: string,
      fileSize: number,
      fileType: string,
      fileUrl?: string
    ) => db.addAttachment(taskId, aircraftId, fileName, fileSize, fileType, fileUrl),
    deleteAttachment: (id: string) => db.deleteAttachment(id),
    renameTask: (taskId: string, newName: string) => db.updateTask(taskId, { name: newName }),
    // Repair Orders (RO) Module
    repairOrders: db.getRepairOrders(),
    roColumns: db.getRepairOrderColumns(),
    getRepairOrdersForUser: (userId?: string) => db.getRepairOrders(userId),
    getRepairOrderColumnsForUser: (userId?: string) => db.getRepairOrderColumns(userId),
    addRepairOrder: (data: Record<string, any>, targetUserId?: string) => db.addRepairOrder(data, targetUserId),
    updateRepairOrder: (id: string, data: Record<string, any>) => db.updateRepairOrder(id, data),
    deleteRepairOrder: (id: string) => db.deleteRepairOrder(id),
    saveRoColumns: (userId: string, columns: any[]) => db.saveRepairOrderColumns(userId, columns),
    resetRoColumns: (userId: string) => db.resetRepairOrderColumns(userId),
    bulkImportRepairOrders: (userId: string, rows: Record<string, any>[], mode?: 'append' | 'replace') =>
      db.bulkImportRepairOrders(userId, rows, mode),
    // Supabase Cloud Connection & Sync
    isSupabaseConnected: db.isSupabaseConnected(),
    realtimeStatus: db.getRealtimeStatus(),
    syncFromSupabase: () => db.syncFromSupabase(),
    cleanupRealtimeSync: () => db.cleanupRealtimeSync(),
    reconnectRealtimeSync: () => db.setupRealtimeSync(),
    db,
  };
}
