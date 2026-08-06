import { useState } from "react";
import BrandLogo from "../components/BrandLogo";

const COLORS = {
    green: "#5EB453",
    greenDark: "#4CA23D",
    greenTint: "#EAF6E8",
    white: "#FFFFFF",
    charcoal: "#323232",
    muted: "#6E6E6E",
    border: "#E3E3E3",
    red: "#C0392B",
    redTint: "#FCEBEB",
};

const FONT =
    "'Source Serif 4', Georgia, 'Times New Roman', serif";

const VALID_USERS = [
    {
        email: "ricardo.infante@radifaxcr.com",
        password: "RadifaxCR2026",
        name: "Ricardo Infante",
        role: "Técnico",
        initials: "RI",
    },
    {
        email: "maria.ceciliano@radifaxcr.com",
        password: "Coord#2026",
        name: "María Fernanda Ceciliano",
        role: "Coordinador técnico",
        initials: "MC",
    },
    {
        email: "kimberly.sanchez@radifaxcr.com",
        password: "Ventas#2026",
        name: "Kimberly Sánchez",
        role: "Vendedor / Ejecutivo de cuenta",
        initials: "KS",
    },
    {
        email: "adriana.mora@radifaxcr.com",
        password: "Gerencia#2026",
        name: "Adriana Mora Quirós",
        role: "Gerente",
        initials: "AM",
    },
    {
        email: "admin@radifaxcr.com",
        password: "Admin#2026",
        name: "Administrador Radifax",
        role: "Administrador del sistema",
        initials: "AR",
    },
];

function Field({
    label,
    type = "text",
    name,
    defaultValue,
    children,
}) {
    return (
        <label className="block mb-5">
            <span
                className="block text-xs mb-2"
                style={{
                    color: COLORS.charcoal,
                    letterSpacing: "0.02em",
                }}
            >
                {label}
            </span>

            {children ?? (
                <input
                    type={type}
                    name={name}
                    defaultValue={defaultValue}
                    className="rf-input w-full px-4 py-3 rounded-lg text-sm bg-white"
                    style={{
                        border: `1px solid ${COLORS.border}`,
                        color: COLORS.charcoal,
                    }}
                />
            )}
        </label>
    );
}

function LoginForm({
    onAuthSuccess,
    onForgotPassword,
}) {
    const [error, setError] = useState("");

    function handleSubmit(event) {
        event.preventDefault();

        const data = new FormData(event.target);

        const email = String(
            data.get("email") ?? ""
        )
            .trim()
            .toLowerCase();

        const password = String(
            data.get("password") ?? ""
        );

        const match = VALID_USERS.find(
            (user) =>
                user.email === email &&
                user.password === password
        );

        if (!match) {
            setError(
                "Credenciales incorrectas. Usá alguna de las cuentas de prueba."
            );
            return;
        }

        setError("");

        onAuthSuccess({
            name: match.name,
            role: match.role,
            initials: match.initials,
        });
    }

    return (
        <form onSubmit={handleSubmit}>
            <Field
                label="Correo corporativo"
                type="email"
                name="email"
                defaultValue="ricardo.infante@radifaxcr.com"
            />

            <Field
                label="Contraseña"
                type="password"
                name="password"
                defaultValue="RadifaxCR2026"
            />

            {error && (
                <div
                    className="mb-5 px-3 py-2 rounded-lg text-xs"
                    style={{
                        backgroundColor:
                            COLORS.redTint,
                        color: COLORS.red,
                    }}
                >
                    {error}
                </div>
            )}

            <div className="flex items-center justify-between mb-8 text-xs">
                <label
                    className="flex items-center gap-2"
                    style={{ color: COLORS.muted }}
                >
                    <input
                        type="checkbox"
                        defaultChecked
                        style={{
                            accentColor: COLORS.green,
                        }}
                    />
                    Recordarme
                </label>

                <button
                    type="button"
                    onClick={onForgotPassword}
                    className="rf-link"
                    style={{
                        color: COLORS.green,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                    }}
                >
                    ¿Olvidaste tu contraseña?
                </button>
            </div>

            <button
                type="submit"
                className="rf-btn w-full py-3 rounded-lg text-sm font-medium"
                style={{
                    backgroundColor: COLORS.green,
                    color: COLORS.white,
                }}
            >
                Iniciar sesión
            </button>

            <details className="mt-6">
                <summary
                    className="text-xs cursor-pointer"
                    style={{ color: COLORS.muted }}
                >
                    Cuentas de prueba por rol
                </summary>

                <ul className="mt-3 space-y-2">
                    {VALID_USERS.map((user) => (
                        <li
                            key={user.email}
                            className="text-xs"
                            style={{
                                color: COLORS.muted,
                            }}
                        >
                            <span
                                style={{
                                    color:
                                        COLORS.charcoal,
                                    fontWeight: 600,
                                }}
                            >
                                {user.role}:
                            </span>{" "}
                            {user.email} / {user.password}
                        </li>
                    ))}
                </ul>
            </details>
        </form>
    );
}

function ForgotPasswordForm({
    onBackToLogin,
}) {
    const [step, setStep] = useState("email");
    const [email, setEmail] = useState(
        "ricardo.infante@radifaxcr.com"
    );

    if (step === "email") {
        return (
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    setStep("reset");
                }}
            >
                <p
                    className="text-sm mb-6"
                    style={{ color: COLORS.muted }}
                >
                    Ingresá tu correo corporativo y te
                    enviaremos un código para restablecer
                    tu contraseña.
                </p>

                <Field label="Correo corporativo">
                    <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                            setEmail(
                                event.target.value
                            )
                        }
                        className="rf-input w-full px-4 py-3 rounded-lg text-sm bg-white"
                        style={{
                            border: `1px solid ${COLORS.border}`,
                            color: COLORS.charcoal,
                        }}
                    />
                </Field>

                <button
                    type="submit"
                    className="rf-btn w-full py-3 rounded-lg text-sm font-medium"
                    style={{
                        backgroundColor: COLORS.green,
                        color: COLORS.white,
                    }}
                >
                    Enviar código
                </button>

                <button
                    type="button"
                    onClick={onBackToLogin}
                    className="rf-link block text-center text-xs mt-5 w-full"
                    style={{
                        color: COLORS.muted,
                        background: "none",
                        border: "none",
                    }}
                >
                    ← Volver a iniciar sesión
                </button>
            </form>
        );
    }

    if (step === "reset") {
        return (
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    setStep("done");
                }}
            >
                <p
                    className="text-sm mb-6"
                    style={{ color: COLORS.muted }}
                >
                    Te enviamos un código a{" "}
                    <strong
                        style={{
                            color: COLORS.charcoal,
                        }}
                    >
                        {email}
                    </strong>
                    .
                </p>

                <Field
                    label="Código de verificación"
                    name="code"
                    defaultValue="482913"
                />

                <Field
                    label="Nueva contraseña"
                    type="password"
                    name="password"
                    defaultValue="RadifaxCR2026*"
                />

                <Field
                    label="Confirmar nueva contraseña"
                    type="password"
                    name="confirmPassword"
                    defaultValue="RadifaxCR2026*"
                />

                <button
                    type="submit"
                    className="rf-btn w-full py-3 rounded-lg text-sm font-medium"
                    style={{
                        backgroundColor: COLORS.green,
                        color: COLORS.white,
                    }}
                >
                    Restablecer contraseña
                </button>
            </form>
        );
    }

    return (
        <div className="text-center py-4">
            <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                    backgroundColor: COLORS.greenTint,
                    color: COLORS.green,
                    fontSize: "1.25rem",
                }}
            >
                ✓
            </div>

            <p
                className="text-sm mb-8"
                style={{ color: COLORS.charcoal }}
            >
                Tu contraseña se actualizó
                correctamente.
            </p>

            <button
                type="button"
                onClick={onBackToLogin}
                className="rf-btn w-full py-3 rounded-lg text-sm font-medium"
                style={{
                    backgroundColor: COLORS.green,
                    color: COLORS.white,
                }}
            >
                Ir a iniciar sesión
            </button>
        </div>
    );
}

export default function Auth({ onAuthSuccess }) {
    const [mode, setMode] = useState("login");

    return (
        <div
            style={{ fontFamily: FONT }}
            className="min-h-screen w-full flex items-center justify-center bg-white relative overflow-hidden px-4 py-12"
        >
            <style>{`
                .rf-input::placeholder {
                    color: #9C9C9C;
                }

                .rf-input:focus {
                    border-color: ${COLORS.green} !important;
                    box-shadow: 0 0 0 3px ${COLORS.greenTint};
                    outline: none;
                }

                .rf-btn {
                    border: none;
                    cursor: pointer;
                }

                .rf-btn:hover {
                    background-color: ${COLORS.greenDark} !important;
                }

                .rf-link:hover {
                    text-decoration: underline;
                }
            `}</style>

            <svg
                className="absolute pointer-events-none"
                style={{
                    top: "-6rem",
                    right: "-6rem",
                    opacity: 0.5,
                }}
                width="420"
                height="420"
                viewBox="0 0 420 420"
            >
                <circle
                    cx="210"
                    cy="210"
                    r="60"
                    fill="none"
                    stroke={COLORS.green}
                    strokeOpacity="0.15"
                    strokeWidth="1.5"
                />
                <circle
                    cx="210"
                    cy="210"
                    r="110"
                    fill="none"
                    stroke={COLORS.green}
                    strokeOpacity="0.12"
                    strokeWidth="1.5"
                />
                <circle
                    cx="210"
                    cy="210"
                    r="160"
                    fill="none"
                    stroke={COLORS.green}
                    strokeOpacity="0.08"
                    strokeWidth="1.5"
                />
            </svg>

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <BrandLogo centered />

                    <div
                        style={{ color: COLORS.muted }}
                        className="text-xs uppercase tracking-widest mt-3"
                    >
                        Portal interno
                    </div>
                </div>

                <div
                    className="bg-white rounded-2xl p-10"
                    style={{
                        border: `1px solid ${COLORS.border}`,
                        boxShadow:
                            "0 1px 3px rgba(50,50,50,0.06)",
                    }}
                >
                    <h1
                        className="text-xl mb-2"
                        style={{
                            color: COLORS.charcoal,
                            fontWeight: 600,
                        }}
                    >
                        {mode === "forgot"
                            ? "Restablecer contraseña"
                            : "Iniciar sesión"}
                    </h1>

                    <p
                        className="text-xs mb-8"
                        style={{ color: COLORS.muted }}
                    >
                        Las cuentas y sus roles son
                        administrados internamente.
                    </p>

                    {mode === "login" && (
                        <LoginForm
                            onAuthSuccess={
                                onAuthSuccess
                            }
                            onForgotPassword={() =>
                                setMode("forgot")
                            }
                        />
                    )}

                    {mode === "forgot" && (
                        <ForgotPasswordForm
                            onBackToLogin={() =>
                                setMode("login")
                            }
                        />
                    )}
                </div>

                <p
                    className="text-center text-xs mt-8"
                    style={{ color: COLORS.muted }}
                >
                    © {new Date().getFullYear()} Radifax
                    S.A. — Sistema interno de gestión
                </p>
            </div>
        </div>
    );
}