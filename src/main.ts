import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin, QueryClient, QueryCache, MutationCache } from "@tanstack/vue-query";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "@/stores/auth";
import "./index.css";

function isUnauthorizedError(error: any): boolean {
  const code = error?.data?.code ?? error?.code ?? error?.message;
  return (
    code === "UNAUTHORIZED" ||
    (typeof code === "string" && code.includes("UNAUTHORIZED"))
  );
}

function handleAuthError(error: any) {
  if (isUnauthorizedError(error)) {
    localStorage.removeItem("dreamdocs_auth");
    if (window.location.hash !== "#/login") {
      window.location.hash = "#/login";
    }
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => handleAuthError(error),
  }),
  mutationCache: new MutationCache({
    onError: (error) => handleAuthError(error),
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        if (isUnauthorizedError(error)) return false;
        return failureCount < 3;
      },
    },
    mutations: {
      retry: (failureCount, error: any) => {
        if (isUnauthorizedError(error)) return false;
        return failureCount < 3;
      },
    },
  },
});

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());

  const auth = useAuthStore();
  await auth.fetchUser();

  app.use(router);
  app.use(VueQueryPlugin, { queryClient });
  app.mount("#app");
}

bootstrap();
