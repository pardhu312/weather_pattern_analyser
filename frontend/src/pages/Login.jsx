import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
    OrbitControls,
    Float,
    Stars,
    useTexture
} from "@react-three/drei";
import { useNavigate } from "react-router-dom";
import "./Login.css";


function WeatherGlobe() {
    const globeRef = useRef();
    const earthTexture = useTexture(
        "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg"
    );    

    useFrame((_, delta) => {
        if (globeRef.current) {
            globeRef.current.rotation.y += delta * 0.12;
        }
    });

    return (
        <>
            <ambientLight intensity={0.8} />

            <directionalLight
                position={[4, 3, 5]}
                intensity={2}
            />

            <pointLight
                position={[-4, 1, 3]}
                intensity={0.8}
                color="#60a5fa"
            />

            <Float
                speed={1}
                rotationIntensity={0.15}
                floatIntensity={0.25}
            >
                <group ref={globeRef}>

                    {/* Real Earth */}
                    <mesh>

                        <sphereGeometry
                            args={[2.2, 96, 96]}
                        />

                        <meshStandardMaterial
                            map={earthTexture}
                            roughness={0.75}
                            metalness={0.05}
                        />

                    </mesh>

                    {/* Atmospheric glow */}
                    <mesh scale={1.035}>

                        <sphereGeometry
                            args={[2.2, 96, 96]}
                        />

                        <meshBasicMaterial
                            color="#38bdf8"
                            transparent
                            opacity={0.07}
                            side={2}
                        />

                    </mesh>

                    {/* Orbit ring */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>

                        <torusGeometry
                            args={[2.48, 0.012, 16, 128]}
                        />

                        <meshBasicMaterial
                            color="#38bdf8"
                            transparent
                            opacity={0.65}
                        />

                    </mesh>

                    {/* Second ring */}
                    <mesh rotation={[0.8, 0.4, 0]}>

                        <torusGeometry
                            args={[2.6, 0.009, 16, 128]}
                        />

                        <meshBasicMaterial
                            color="#60a5fa"
                            transparent
                            opacity={0.4}
                        />

                    </mesh>

                </group>
            </Float>

            <Stars
                radius={9}
                depth={5}
                count={1800}
                factor={2}
                saturation={0}
                fade
                speed={0.35}
            />

            <OrbitControls
                enableZoom={false}
                enablePan={false}
                autoRotate={false}
            />
        </>
    );
}

function Login() {
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const fillDemoCredentials = () => {
        setUsername("admin");
        setPassword("YourOwnStrongPassword123!");
    };

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");
        setLoading(true);

        const baseUrl = import.meta.env.VITE_WEATHER_API_URL || "http://localhost:8080";

        try {
            const response = await fetch(
                `${baseUrl}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username,
                        password
                    })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || `Login failed (${response.status})`
                );
            }

            sessionStorage.setItem(
                "weather_token",
                data.token
            );

            sessionStorage.setItem(
                "weather_username",
                data.username
            );

            sessionStorage.setItem(
                "weather_role",
                data.role
            );

            navigate("/dashboard");

        } catch (err) {
            setError(
                err.message ||
                "Unable to connect to weather authentication service."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-scene">

            {/* Background */}
            <div className="login-glow glow-one"></div>
            <div className="login-glow glow-two"></div>

            {/* 3D section */}
            <div className="globe-section">

                <div className="brand-label">
                    <span className="brand-dot"></span>

                    WEATHER INTELLIGENCE
                </div>

                <div className="globe-canvas">

                    <Canvas
                        camera={{
                            position: [0, 0, 6],
                            fov: 45
                        }}
                    >
                        <WeatherGlobe />
                    </Canvas>

                </div>

                <div className="globe-copy">

                    <h1>
                        Understand Weather.
                        <br />
                        Predict Patterns.
                    </h1>

                    <p>
                        A data-driven weather intelligence
                        platform powered by real-time
                        observations and machine learning.
                    </p>

                    <div className="feature-pills">

                        <span>LIVE DATA</span>
                        <span>AI ANALYTICS</span>
                        <span>5 CITIES</span>

                    </div>

                </div>

            </div>

            {/* Login section */}
            <div className="login-section">

                <div className="login-card">

                    <div className="login-card-header">

                        <div className="mini-logo">
                            W
                        </div>

                        <div>

                            <p className="eyebrow">
                                WEATHER PATTERN ANALYZER
                            </p>

                            <h2>
                                Welcome back
                            </h2>

                            <p className="login-description">
                                Sign in to access your weather
                                intelligence dashboard.
                            </p>

                        </div>

                    </div>

                    <form onSubmit={handleSubmit}>

                        <div className="field">

                            <label>
                                Username
                            </label>

                            <input
                                type="text"
                                value={username}
                                onChange={(event) =>
                                    setUsername(
                                        event.target.value
                                    )
                                }
                                placeholder="Enter your username"
                                autoComplete="username"
                                required
                            />

                        </div>

                        <div className="field">

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <label>
                                    Password
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "#38bdf8",
                                        fontSize: "11px",
                                        cursor: "pointer",
                                        padding: 0
                                    }}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>

                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(event) =>
                                    setPassword(
                                        event.target.value
                                    )
                                }
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                            />

                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
                            <button
                                type="button"
                                onClick={fillDemoCredentials}
                                style={{
                                    background: "rgba(56, 189, 248, 0.08)",
                                    border: "1px solid rgba(56, 189, 248, 0.2)",
                                    color: "#38bdf8",
                                    fontSize: "11px",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    cursor: "pointer"
                                }}
                            >
                                Use default credentials
                            </button>
                        </div>

                        {error && (
                            <div className="login-error">
                                {error}
                            </div>
                        )}

                        <button
                            className="login-button"
                            type="submit"
                            disabled={loading}
                        >
                            <span>
                                {loading
                                    ? "Authenticating..."
                                    : "Sign In"}
                            </span>

                            {!loading && (
                                <span className="arrow">
                                    →
                                </span>
                            )}
                        </button>

                    </form>

                    <div className="security-note">

                        <span>●</span>

                        Secure authentication · JWT protected

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Login;