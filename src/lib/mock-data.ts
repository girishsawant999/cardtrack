import { Bill, BillWithCard, CreditCard, Notification } from "./types/database";


const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

const hdfcStatementDate = new Date(currentYear, currentMonth, 16);
const hdfcDueDate = new Date(currentYear, currentMonth, 16 + 20);

const iciciStatementDate = new Date(currentYear, currentMonth - 1, 6);
const iciciDueDate = new Date(currentYear, currentMonth - 1, 6 + 15);

const sbiStatementDate = new Date(currentYear, currentMonth - 1, 21);
const sbiDueDate = new Date(currentYear, currentMonth - 1, 21 + 20);
const sbiPaidDate = new Date(currentYear, currentMonth, 5);

