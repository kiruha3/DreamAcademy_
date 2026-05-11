import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { trpc } from "@/lib/trpc";

export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  avatar: string | null;
  status?: string;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);

  const isAdmin = computed(() =>
    ["admin", "superadmin"].includes(user.value?.role ?? "")
  );

  const isSuperAdmin = computed(() => user.value?.role === "superadmin");

  async function fetchUser() {
    isLoading.value = true;
    try {
      const me = await trpc.auth.me.query();
      user.value = me;
      if (!me) {
        localStorage.removeItem("dreamdocs_auth");
      }
    } catch {
      user.value = null;
      localStorage.removeItem("dreamdocs_auth");
    } finally {
      isLoading.value = false;
    }
  }

  async function login(email: string, password: string) {
    isLoading.value = true;
    try {
      const result = await trpc.auth.login.mutate({ email, password });
      user.value = result.user;
      if (result.token) {
        localStorage.setItem("dreamdocs_auth", result.token);
      }
      return result;
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    isLoading.value = true;
    try {
      await trpc.auth.logout.mutate();
    } catch {
      // Ignore server errors — always clear client state
    } finally {
      user.value = null;
      localStorage.removeItem("dreamdocs_auth");
      isLoading.value = false;
    }
  }

  return {
    user,
    isLoading,
    isAdmin,
    isSuperAdmin,
    fetchUser,
    login,
    logout,
  };
});
