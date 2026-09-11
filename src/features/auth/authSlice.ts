import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../../services/authApi";
import type { Role } from "../../config/roles";

type AuthState = {
  user: User | null;
  role: Role | null;
  roles: string[];
  status: "idle" | "authenticating" | "authenticated" | "error";
  message?: string;
};

const initialState: AuthState = {
  user: null,
  role: null,
  roles: [],
  status: "idle",
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<User | null>) {
      state.user = action.payload;
      state.status = action.payload ? "authenticated" : "idle";
    },
    setRole(state, action: PayloadAction<{ role: Role; roles: string[] }>) {
      state.role = action.payload.role;
      state.roles = action.payload.roles;
    },
    setStatus(state, action: PayloadAction<AuthState["status"]>) {
      state.status = action.payload;
    },
    setMessage(state, action: PayloadAction<string | undefined>) {
      state.message = action.payload;
    },
    clearAuth(state) {
      state.user = null;
      state.role = null;
      state.roles = [];
      state.status = "idle";
      state.message = undefined;
    },
  },
});

export const { setUser, setRole, setStatus, setMessage, clearAuth } = authSlice.actions;
export default authSlice.reducer;
