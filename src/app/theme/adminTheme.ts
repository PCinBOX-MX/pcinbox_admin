import { createTheme, alpha } from "@mui/material/styles";

const primary = "#bb3d4b";
const primaryDark = "#9a3139";

export const adminTheme = createTheme({
  palette: {
    primary: {
      main: primary,
      dark: primaryDark,
      light: "#fdf2f3",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#374151",
    },
    background: {
      default: "#f4f5f7",
      paper: "#ffffff",
    },
    text: {
      primary: "#111827",
      secondary: "#6b7280",
    },
    divider: "#e8e8ec",
    error: {
      main: "#dc2626",
    },
  },
  typography: {
    fontFamily:
      'var(--font-inter), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.01em" },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500, fontSize: "0.875rem" },
    body1: { fontSize: "0.9375rem", lineHeight: 1.55 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#f4f5f7",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: "0.65rem 1.15rem",
          boxShadow: "none",
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
          "&:hover": {
            background: `linear-gradient(135deg, ${primaryDark} 0%, #7f2830 100%)`,
            boxShadow: `0 6px 16px ${alpha(primary, 0.35)}`,
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "medium",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: "#fafafa",
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(primary, 0.45),
          },
          "&.Mui-focused": {
            backgroundColor: "#fff",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: primary,
            borderWidth: 2,
          },
        },
        notchedOutline: {
          borderColor: "#e5e7eb",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          color: "#4b5563",
        },
      },
    },
    MuiPagination: {
      defaultProps: {
        shape: "rounded",
        color: "primary",
      },
      styleOverrides: {
        ul: {
          gap: 4,
        },
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: "0.875rem",
          "&.Mui-selected": {
            background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
            color: "#fff",
            "&:hover": {
              background: `linear-gradient(135deg, ${primaryDark} 0%, #7f2830 100%)`,
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 14,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPopper: {
      styleOverrides: {
        root: {
          zIndex: 1600,
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        root: {
          zIndex: 1600,
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        MenuProps: {
          disableScrollLock: true,
        },
      },
    },
    MuiMenu: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
  },
});

export const dataGridSx = {
  border: "none",
  minHeight: 440,
  width: "100%",
  fontFamily: adminTheme.typography.fontFamily,
  "& .MuiDataGrid-columnHeaders": {
    backgroundColor: "#f9fafb",
    borderBottom: "1px solid #e8e8ec",
    minHeight: "56px !important",
  },
  "& .MuiDataGrid-columnHeader": {
    px: 1.5,
  },
  "& .MuiDataGrid-columnHeaderTitleContainer": {
    justifyContent: "center",
  },
  "& .MuiDataGrid-columnHeaderTitleContainerContent": {
    justifyContent: "center",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: "0.72rem",
    fontWeight: 700,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "normal",
    lineHeight: 1.35,
    textAlign: "center",
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    px: 1.75,
    py: 1.5,
    fontSize: "0.875rem",
    color: "#374151",
    lineHeight: 1.45,
    textAlign: "center",
  },
  "& .MuiDataGrid-cellContent": {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  "& .MuiDataGrid-row": {
    transition: "background-color 0.15s ease",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: "#fdf2f3",
  },
  "& .MuiDataGrid-row.Mui-selected": {
    backgroundColor: alpha(primary, 0.06),
  },
  "& .MuiDataGrid-overlay": {
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  "& .MuiCircularProgress-root": {
    color: primary,
  },
  "& .MuiDataGrid-scrollbarFiller": {
    backgroundColor: "#f9fafb",
  },
  "& .MuiDataGrid-virtualScroller": {
    minHeight: 360,
  },
};
