import { api } from "@/lib/api/client";
import type { UserDto } from "@/types/domain";
import type { RegisterPayload } from "../validators/authSchemas";

export const authService = {
  register: (payload: RegisterPayload) => api.post<UserDto>("/auth/register", payload, { auth: false }),
  me: () => api.get<UserDto>("/users/me"),
  updateMe: (payload: { fullName: string; phone?: string }) => api.put<UserDto>("/users/me", payload),
};
