"use client"

interface WaterCrossSectionProps {
    currentLevel: number
    maxLevel: number
    normalLevel: number
    status: string
}

export default function WaterCrossSection({ currentLevel, maxLevel, normalLevel, status }: WaterCrossSectionProps) {
    const getWaterColor = (status: string) => {
        switch (status) {
            case "high":
                return "#ef4444"
            case "warning":
                return "#f59e0b"
            case "low":
                return "#eab308"
            case "normal":
                return "#3b82f6"
            default:
                return "#6b7280"
        }
    }

    const waterPercentage = Math.min((currentLevel / maxLevel) * 100, 100)
    const maxLevelPercentage = 100 // maxLevel is always 100% of the scale
    const normalPercentage = (normalLevel / maxLevel) * 100

    const getChannelProfile = () => {
        if (maxLevel > 9) {
            // Deep channel for stations like FBP.3 (max 13.352m)
            return "M0,90 Q50,110 100,105 Q150,100 200,102 Q250,105 300,95 L300,128 L0,128 Z"
        } else if (maxLevel > 7) {
            // Medium depth channel for stations like P.67 (max 12.2m), P.1 (max 10.0m), FBP.2 (max 9.7m)
            return "M0,95 Q75,115 150,110 Q225,105 300,100 L300,128 L0,128 Z"
        } else {
            // Shallow channel for other stations
            return "M0,100 Q75,120 150,115 Q225,110 300,105 L300,128 L0,128 Z"
        }
    }

    const getBankProfile = () => {
        if (maxLevel > 9) {
            return {
                leftBank: "M0,90 Q30,70 60,75 L60,128 L0,128 Z",
                rightBank: "M240,80 Q270,65 300,70 L300,128 L240,128 Z",
            }
        } else if (maxLevel > 7) {
            return {
                leftBank: "M0,95 Q30,80 60,85 L60,128 L0,128 Z",
                rightBank: "M240,85 Q270,70 300,75 L300,128 L240,128 Z",
            }
        } else {
            return {
                leftBank: "M0,100 Q30,85 60,90 L60,128 L0,128 Z",
                rightBank: "M240,95 Q270,80 300,85 L300,128 L240,128 Z",
            }
        }
    }

    const channelProfile = getChannelProfile()
    const bankProfile = getBankProfile()

    return (
        <div className="space-y-3">
            <div className="relative w-full h-32 bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 rounded-lg overflow-hidden border-2 border-gray-200">
                {/* Background terrain */}
                <svg className="absolute inset-0 w-full h-full z-20" viewBox="0 0 300 128" preserveAspectRatio="none">
                    {/* River bed curve - adjusted based on station type */}
                    <path d={channelProfile} fill="#8b5cf6" opacity="0.1" />
                    {/* Left bank */}
                    <path d={bankProfile.leftBank} fill="#92400e" opacity="1" />
                    {/* Right bank */}
                    <path d={bankProfile.rightBank} fill="#92400e" opacity="1" />
                    {/* Vegetation on banks - positioned based on bank height */}
                    <circle cx="30" cy={maxLevel > 12 ? "60" : maxLevel > 9 ? "70" : "75"} r="8" fill="#16a34a" opacity="0.4" />
                    <circle cx="45" cy={maxLevel > 12 ? "55" : maxLevel > 9 ? "65" : "70"} r="6" fill="#16a34a" opacity="0.4" />
                    <circle cx="255" cy={maxLevel > 12 ? "55" : maxLevel > 9 ? "65" : "70"} r="7" fill="#16a34a" opacity="0.4" />
                    <circle cx="270" cy={maxLevel > 12 ? "60" : maxLevel > 9 ? "70" : "75"} r="9" fill="#16a34a" opacity="0.4" />
                </svg>

                {/* Warning level indicator using maxLevel */}
                <div
                    className="absolute left-0 right-0 h-1 bg-red-500 opacity-70 z-10"
                    style={{ bottom: `${(normalLevel / maxLevel) * 30}%` }}
                >
                    <div className="absolute -right-16 -top-2 text-xs text-red-600 font-medium whitespace-nowrap">ระดับเตือนภัย</div>
                </div>



                {/* Current water level */}
                <div
                    className="absolute left-12 right-12 bottom-0 transition-all duration-1000 ease-in-out"
                    style={{
                        height: `${Math.max(waterPercentage * 0.6, 8)}%`,
                        background: `linear-gradient(to top, ${getWaterColor(status)}CC, ${getWaterColor(status)}88)`,
                    }}
                >
                    {/* Water surface animation */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white opacity-60 animate-pulse"></div>
                </div>

                {/* Water level measurement lines */}
                <div className="absolute right-2 top-2 bottom-2 w-8 bg-white bg-opacity-80 rounded border z-25">
                    <div className="relative h-full">
                        {/* Scale marks */}
                        {[0, 25, 50, 75, 100].map((mark) => (
                            <div key={mark} className="absolute right-0 w-2 h-px bg-gray-400" style={{ bottom: `${mark * 0.6}%` }}>
                                <span className="absolute -right-8 -top-2 text-xs text-gray-600">
                                    {Math.round((mark / 100) * maxLevel)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Current level indicator */}
                <div
                    className="absolute right-2 w-3 h-3 rounded-full border-2 border-white z-30"
                    style={{
                        bottom: `${Math.max(waterPercentage * 0.6, 8)}%`,
                        backgroundColor: getWaterColor(status),
                    }}
                >
                    <div className="absolute -left-16 -top-2 text-xs font-bold text-gray-800 whitespace-nowrap bg-white px-1 rounded shadow">
                        {currentLevel.toFixed(2)}m
                    </div>
                </div>
            </div>

        </div>
    )
}
