import { UserProfile, MonthlyPerformance } from '../types';

/**
 * Role-Based Access Control (RBAC) & Committee Permission Engine
 * 
 * Rules:
 * 1. HRM / Super Admin: Highest administrative role. Full unrestricted access to all committees,
 *    members, evaluations, tasks, reports, edit & delete capabilities, and statistics.
 * 2. HR Leader: Scoped strictly to their assigned committee (e.g. OR, HR, PR, SM, Media, etc.).
 *    Can only view, evaluate, track attendance for, add notes to, and manage members belonging to their OWN committee.
 * 3. Member: Scoped to their own data and general public committee resources.
 */

/**
 * Normalizes committee names for comparison (handles department mappings like 'HRM - HR OF OR' -> 'OR')
 */
export const getEffectiveCommittee = (user: Partial<UserProfile> | null | undefined): string => {
  if (!user) return 'None';
  if (user.role === 'Super Admin') return 'All';

  const dept = (user.department || '').toUpperCase();
  const subComm = ((user as any).subCommittee || '').toUpperCase();

  // Check sub-committee or department mapping first (e.g. 'HR OF OR' -> 'OR', 'HR OF SM' -> 'SM', 'HR OF PR' -> 'PR')
  if (subComm.includes('HR OF OR') || dept.includes('HR OF OR')) return 'OR';
  if (subComm.includes('HR OF PR') || dept.includes('HR OF PR')) return 'PR';
  if (subComm.includes('HR OF SM') || dept.includes('HR OF SM')) return 'SM';
  if (subComm.includes('HR OF MEDIA') || dept.includes('HR OF MEDIA')) return 'Media';
  if (subComm.includes('HR OF HR') || dept.includes('HR OF HR')) return 'HR';

  // General HRM without sub-committee applies to All
  if (user.role === 'HRM') return 'All';

  if (user.committee === 'OR') return 'OR';
  if (user.committee === 'PR') return 'PR';
  if (user.committee === 'SM') return 'SM';
  if (user.committee === 'Media') return 'Media';
  if (user.committee === 'HR') return 'HR';

  return user.committee || 'None';
};

export const isHRVice = (user: Partial<UserProfile> | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'Vice' && (user.committee === 'HR' || (user.department || '').includes('HR'));
};

export const isCentralHR = (user: Partial<UserProfile> | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'Central' && (user.committee === 'HR' || (user.department || '').includes('HR'));
};

/**
 * Returns true if the user has HRM / Super Admin / HR Vice / Central HR administrative privileges
 */
export const isHRM = (user: Partial<UserProfile> | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'Super Admin' || user.role === 'HRM' || isHRVice(user) || isCentralHR(user);
};

/**
 * Returns true if the user is a Leader, Central official, or Coordinator for a given committee (or HRM/HR Vice)
 */
export const isCommitteeLeader = (user: UserProfile | null | undefined, committee?: string): boolean => {
  if (!user) return false;
  if (isHRM(user)) return true;

  const isLeaderRole = user.role === 'Leader' || user.role === 'Head' || user.role === 'Vice' || user.role === 'Coordinator' || user.role === 'Deputy Coordinator' || user.role === 'Central';
  if (!isLeaderRole) return false;

  if (!committee) return true;
  const effectiveComm = getEffectiveCommittee(user);
  return effectiveComm === committee || user.committee === committee;
};

/**
 * Checks if current user can view a target member profile
 */
export const canViewMember = (currentUser: UserProfile | null | undefined, targetMember: UserProfile): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'Super Admin') return true;
  if (currentUser.id === targetMember.id) return true;

  const currentUserComm = getEffectiveCommittee(currentUser);
  const targetComm = getEffectiveCommittee(targetMember);

  if (currentUserComm === 'All') return true;

  const isLeaderRole = currentUser.role === 'Leader' || currentUser.role === 'Vice' || currentUser.role === 'Head' || currentUser.role === 'Coordinator' || currentUser.role === 'Deputy Coordinator' || currentUser.role === 'Central' || currentUser.role === 'HRM';
  if (isLeaderRole) {
    return currentUserComm === targetComm || currentUser.committee === targetMember.committee;
  }

  return currentUserComm === targetComm;
};

/**
 * Checks if current user can edit or manage a target member profile
 */
export const canManageMember = (currentUser: UserProfile | null | undefined, targetMember: UserProfile): boolean => {
  if (!currentUser) return false;
  if (currentUser.role === 'Super Admin') return true;

  const currentUserComm = getEffectiveCommittee(currentUser);
  const targetComm = getEffectiveCommittee(targetMember);

  if (currentUserComm === 'All') return true;

  const isLeaderRole = currentUser.role === 'Leader' || currentUser.role === 'Vice' || currentUser.role === 'Head' || currentUser.role === 'Coordinator' || currentUser.role === 'Deputy Coordinator' || currentUser.role === 'Central' || currentUser.role === 'HRM';
  if (isLeaderRole) {
    return (currentUserComm === targetComm || currentUser.committee === targetMember.committee);
  }

  return false;
};

/**
 * Checks if current user can evaluate a target member
 * Rules:
 * 1. Super Admin and General HRM Leader evaluate all members ("لكل الناس").
 * 2. HRM Sub-branch Leaders (HR OF OR, HR OF SM, HR OF PR) evaluate members of THEIR committee ("أعضاء لجمتهم الفرعية").
 * 3. Committee Leaders (PR, OR, SM) evaluate members of their committee.
 * 4. Non-HR Vices cannot evaluate members.
 */
export const canEvaluateMember = (currentUser: UserProfile | null | undefined, targetMember: UserProfile): boolean => {
  if (!currentUser) return false;
  if (currentUser.id === targetMember.id) return false; // cannot self-evaluate
  if (currentUser.role === 'Super Admin') return true;

  const dept = (currentUser.department || '').toUpperCase();
  const subComm = ((currentUser as any).subCommittee || '').toUpperCase();
  const isSubHRM = dept.includes('HR OF ') || subComm.includes('HR OF ');

  // General HRM without sub-committee evaluates everyone
  if (currentUser.role === 'HRM' && !isSubHRM) return true;

  const currentUserComm = getEffectiveCommittee(currentUser);
  const targetComm = getEffectiveCommittee(targetMember);

  if (currentUserComm === 'All') return true;

  if (currentUserComm === targetComm || currentUser.committee === targetMember.committee) {
    return true;
  }

  if (isSubHRM) {
    const hrTargetComm = (subComm || dept).split('HR OF ')[1]?.trim().toUpperCase() || '';
    if (hrTargetComm && (targetComm.toUpperCase() === hrTargetComm || targetMember.committee?.toUpperCase() === hrTargetComm)) {
      return true;
    }
  }

  return false;
};

/**
 * Filters a list of members based on current user's RBAC scope
 */
export const filterMembersByPermission = (currentUser: UserProfile | null | undefined, members: UserProfile[]): UserProfile[] => {
  if (!currentUser) return [];
  if (currentUser.role === 'Super Admin') return members;

  const dept = (currentUser.department || '').toUpperCase();
  const subComm = ((currentUser as any).subCommittee || '').toUpperCase();
  const isSubHRM = dept.includes('HR OF ') || subComm.includes('HR OF ');

  if (currentUser.role === 'HRM' && !isSubHRM) return members;

  const userComm = getEffectiveCommittee(currentUser);
  if (userComm === 'All') return members;

  return members.filter(m => {
    if (m.id === currentUser.id) return true;
    const targetComm = getEffectiveCommittee(m);
    if (targetComm === userComm || m.committee === currentUser.committee) return true;
    if (isSubHRM) {
      const hrTargetComm = (subComm || dept).split('HR OF ')[1]?.trim().toUpperCase() || '';
      if (hrTargetComm && (targetComm.toUpperCase() === hrTargetComm || m.committee?.toUpperCase() === hrTargetComm)) {
        return true;
      }
    }
    return false;
  });
};

/**
 * Filters a list of member evaluations based on current user's RBAC scope
 */
export const filterEvaluationsByPermission = <T extends { memberId?: string; committee?: string }>(
  currentUser: UserProfile | null | undefined,
  evaluations: T[],
  membersMap?: Map<string, UserProfile>
): T[] => {
  if (!currentUser) return [];
  if (isHRM(currentUser)) return evaluations;

  const userComm = getEffectiveCommittee(currentUser);

  return evaluations.filter(ev => {
    if (ev.memberId && membersMap) {
      const member = membersMap.get(ev.memberId);
      if (member) {
        const targetComm = getEffectiveCommittee(member);
        return targetComm === userComm || member.committee === currentUser.committee;
      }
    }
    return ev.committee === userComm || ev.committee === currentUser.committee;
  });
};
