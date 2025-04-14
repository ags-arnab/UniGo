/**
 * Error model interface
 */
export interface ErrorData {
  code: number;
  message: string;
  description?: string;
}

/**
 * Predefined error models for common HTTP errors
 */
export const ErrorModels = {
  NOT_FOUND: {
    code: 404,
    message: "Page Not Found",
    description: "The page you are looking for does not exist or has been moved to another location."
  },
  UNAUTHORIZED: {
    code: 401,
    message: "Unauthorized",
    description: "You are not authorized to access this resource."
  },
  FORBIDDEN: {
    code: 403,
    message: "Forbidden",
    description: "You do not have permission to access this resource."
  },
  SERVER_ERROR: {
    code: 500,
    message: "Server Error",
    description: "An error occurred on the server. Please try again later."
  }
};

/**
 * Utility function to get error data by error code
 */
export const getErrorByCode = (code: number): ErrorData => {
  switch (code) {
    case 404:
      return ErrorModels.NOT_FOUND;
    case 401:
      return ErrorModels.UNAUTHORIZED;
    case 403:
      return ErrorModels.FORBIDDEN;
    case 500:
      return ErrorModels.SERVER_ERROR;
    default:
      return {
        code,
        message: "Error",
        description: "An unknown error occurred."
      };
  }
};