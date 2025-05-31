interface UserClaims {
	role: string;
	branchId: string;
  }
  
  export function checkCreateUserPermission(
	creator: UserClaims,
	targetRole: string,
	targetBranchId: string
  ): { allowed: boolean; message?: string } {
	// Sales can't create anyone
	if (creator.role === "sales") {
	  return { allowed: false, message: "Sales cannot create users" };
	}
  
	// Managers can only create sales in their own branch
	if (creator.role === "manager") {
	  if (targetRole !== "sales") {
		return { allowed: false, message: "Managers can only create sales users" };
	  }
	  if (creator.branchId !== targetBranchId) {
		return {
		  allowed: false,
		  message: "Managers can only create users in their own branch",
		};
	  }
	}
  
	// Admins can create any user
	return { allowed: true };
  }
  