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
      default: "#eceef4",
      paper: "#ffffff",
    },
    text: {
      primary: "#111827",
      secondary: "#6b7280",
    },
    divider: "#e8ecf4",
    error: {
      main: "#dc2626",
    },
  },
  typography: {
    fontFamily:
      'var(--font-inter), system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h1: { fontWeight: 800, letterSpacing: "-0.03em" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500, fontSize: "0.875rem" },
    body1: { fontSize: "0.9375rem", lineHeight: 1.55 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 },
    button: {
      textTransform: "none",
      fontWeight: 700,
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
          backgroundColor: "transparent",
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
            boxShadow: `0 8px 20px ${alpha(primary, 0.38)}`,
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
          backgroundColor: "#fafbfc",
          transition: "background-color 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            backgroundColor: "#fff",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: alpha(primary, 0.45),
          },
          "&.Mui-focused": {
            backgroundColor: "#fff",
            boxShadow: `0 0 0 3px ${alpha(primary, 0.12)}`,
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
          fontWeight: 600,
          color: "#4b5563",
          "&.Mui-focused": {
            color: primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          borderRadius: 8,
        },
        outlined: {
          borderColor: "#e5e7eb",
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
          fontWeight: 700,
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
          borderRadius: 16,
        },
        elevation1: {
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          fontWeight: 500,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: "2px 6px",
          fontWeight: 500,
          "&.Mui-selected": {
            backgroundColor: alpha(primary, 0.08),
            fontWeight: 700,
          },
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
      styleOverrides: {
        paper: {
          borderRadius: 14,
          border: "1px solid #e8ecf4",
          boxShadow: "0 16px 40px rgba(15, 23, 42, 0.12)",
        },
      },
    },
  },
});

export const dataGridSx = {
  border: "none",
  minHeight: 440,
  width: "100%",
  fontFamily: adminTheme.typography.fontFamily,
  borderRadius: "14px",
  overflow: "hidden",
  "& .MuiDataGrid-columnHeaders": {
    background: "linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%)",
    borderBottom: `2px solid ${alpha(primary, 0.12)}`,
    minHeight: "58px !important",
  },
  "& .MuiDataGrid-columnHeader": {
    px: 1.5,
    "&:focus, &:focus-within": {
      outline: "none",
    },
  },
  "& .MuiDataGrid-columnHeaderTitleContainer": {
    justifyContent: "center",
  },
  "& .MuiDataGrid-columnHeaderTitleContainerContent": {
    justifyContent: "center",
  },
  "& .MuiDataGrid-columnHeaderTitle": {
    fontSize: "0.7rem",
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    whiteSpace: "normal",
    lineHeight: 1.35,
    textAlign: "center",
  },
  "& .MuiDataGrid-cell": {
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    px: 1.75,
    py: 1.75,
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
    transition: "background-color 0.18s ease, box-shadow 0.18s ease",
  },
  "& .MuiDataGrid-row:nth-of-type(even)": {
    backgroundColor: "#fafbfc",
  },
  "& .MuiDataGrid-row:hover": {
    backgroundColor: alpha(primary, 0.05),
    boxShadow: `inset 3px 0 0 ${primary}`,
  },
  "& .MuiDataGrid-row.Mui-selected": {
    backgroundColor: alpha(primary, 0.08),
  },
  "& .MuiDataGrid-overlay": {
    backgroundColor: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(4px)",
  },
  "& .MuiCircularProgress-root": {
    color: primary,
  },
  "& .MuiDataGrid-scrollbarFiller": {
    backgroundColor: "#f8fafc",
  },
  "& .MuiDataGrid-virtualScroller": {
    minHeight: 360,
  },
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid #e8ecf4",
    backgroundColor: "#fafbfc",
  },
};
