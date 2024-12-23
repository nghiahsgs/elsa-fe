import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../store/authStore';
import { jwtDecode } from 'jwt-decode';

interface JWTPayload {
  sub: string;  // email
  exp: number;
}

export const useAuth = (requireAuth: boolean = true) => {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token && requireAuth) {
          // No token found, redirect to login
          router.push('/login');
          return;
        }

        if (token && !user) {
          // Decode token to get user info
          const decoded = jwtDecode<JWTPayload>(token);
          
          // Check if token is expired
          if (decoded.exp * 1000 < Date.now()) {
            logout();
            router.push('/login');
            return;
          }

          // Set user info from token
          setUser({ email: decoded.sub });
        }
      } catch (error) {
        console.error('Auth error:', error);
        if (requireAuth) {
          logout();
          router.push('/login');
        }
      }
    };

    checkAuth();
  }, [user, setUser, logout, router, requireAuth]);

  return { user, isAuthenticated: !!user };
};
