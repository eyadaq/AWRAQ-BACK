import admin from "firebase-admin";
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
	uid: string;
	role: string;
	firstName: string;
	branchId: string;
  };
}

export interface CreateUserRequest extends AuthenticatedRequest {
  body: {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	role: string;
	branchId: string;
  };
}

export interface UserData {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId: string;
  isDelete: boolean;
  createdAt?: admin.firestore.Timestamp;
  deletedAt?: admin.firestore.Timestamp;
  [key: string]: any; // Allow additional properties
}

export interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}
