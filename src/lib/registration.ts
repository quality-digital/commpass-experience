let pendingRegistrationPassword: string | null = null;

export const setPendingRegistrationPassword = (password: string) => {
  pendingRegistrationPassword = password;
};

export const getPendingRegistrationPassword = () => pendingRegistrationPassword;

export const clearPendingRegistrationPassword = () => {
  pendingRegistrationPassword = null;
};