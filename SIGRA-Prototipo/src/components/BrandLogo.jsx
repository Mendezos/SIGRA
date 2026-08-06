import { useState } from "react";

const COLORS = {
    charcoal: "#323232",
};

export default function BrandLogo({
    compact = false,
    centered = false,
    className = "",
}) {
    const [imageFailed, setImageFailed] = useState(false);

    return (
        <div
            className={`${centered ? "flex justify-center" : ""} ${className}`}
        >
            {imageFailed ? (
                <span
                    className={compact ? "text-lg font-semibold" : "text-2xl font-semibold"}
                    style={{
                        color: COLORS.charcoal,
                        letterSpacing: "0.12em",
                    }}
                >
                    RADIFAX
                </span>
            ) : (
                <img
                    src="/radifax-logo.png"
                    alt="Radifax"
                    onError={() => setImageFailed(true)}
                    className={compact ? "h-10 w-auto" : "h-16 w-auto"}
                    style={{ objectFit: "contain" }}
                />
            )}
        </div>
    );
}