"use client"

interface WaterCrossSectionProps {
    currentLevel: number
    maxLevel: number
    normalLevel: number
    status: string
    stationId: number
    rightBank: number
    leftBank: number
    bm: number
}

export default function WaterCrossSection({
    currentLevel,
    maxLevel,
    normalLevel,
    rightBank,
    leftBank,
    bm,
    status,
    stationId,
}: WaterCrossSectionProps) {
    const getStationImage = () => {
        const imageMap: { [key: number]: string } = {
            1: "/images/p67.png", // P.67 - สะพานแม่แฝก
            2: "/images/p1.png", // P.1 - สะพานนวรัฐ
            3: "/images/p1.png", // P.1 - สะพานนวรัฐ
            4: "/images/floodboy22.png", // FBP.2 - สะพานเม็งราย
            5: "/images/floodboy21.png", // FBP.3 - สะพานวัดเกาะกลาง
        }
        return imageMap[stationId] || "/images/p67.png" // Default to p67.png
    }

    const chartWidth = "100%"
    const chartHeight = "80%"

    const containerHeight = 210 // Fixed height for calculations
    const waterLevelPercent = Math.min(100, (currentLevel / (rightBank * 1.34)) * 100)
    const maxLevelPercent = Math.min(100, (maxLevel / (rightBank *1.34)) * 100)
    const rightBankPercent = Math.min(100, (rightBank / (rightBank * 1.1)) * 100)
    const leftBankPercent = Math.min(100, (leftBank / (leftBank * 1.1)) * 100)
    

    return (
        <div
            className="relative bg-white rounded-lg border overflow-hidden"
            style={{ width: chartWidth, height: chartHeight, minHeight: `${containerHeight}px` }}
        >
            <img
                src={getStationImage() || "/placeholder.svg"}
                alt="Cross-section"
                className="absolute inset-0 w-full h-full object-cover z-10"
            />

            <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-600 via-blue-400 to-blue-200 opacity-90"
                style={{
                    height: `${waterLevelPercent}%`,
                    clipPath: "polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)",
                }}
            />

            <div
                className="absolute left-5 right-5 border-t-2 border-red-500 border-dashed"
                style={{ bottom: `${maxLevelPercent}%` }}
            />

            <div
                className="absolute right-0 text-[10px] text-white px-2 py-1 rounded z-20"
                //className="absolute right-1 text-black px-2 py-1 rounded text-xs font-bold z-20"
                style={{ bottom: `10px`, transform: "translateY(50%)" }}
            >
                ระดับวิกฤติ {maxLevel.toFixed(2)} ม. ( {(bm+maxLevel).toFixed(2)} ม.รทก.)
            </div> 
            

            <div
                className="absolute right-2 text-[10px] text-black px-2 py-1 rounded text-xs z-20"
                //className="absolute right-1 text-black px-2 py-1 rounded text-xs font-bold z-20"
                style={{ bottom: `${rightBankPercent }%`, transform: "translateY(50%)" }}
            >
                ตลิ่งขวา {rightBank.toFixed(2)} ม. <p>( {(bm+rightBank).toFixed(2)} ม.รทก.)</p>
                {/* ตลิ่งขวา {rightBank.toFixed(1)} ม. ({(rightBank + 304).toFixed(1)} ม.ทรก.) */}
            </div> 

            <div
                className="absolute left-2 text-[10px] text-black px-1 py-1 rounded text-xs z-20"
                style={{ bottom: `${leftBankPercent}%`, transform: "translateY(50%)" }}
            >
                ตลิ่งซ้าย {leftBank.toFixed(2)} ม.  <p>( {(bm+leftBank).toFixed(2)} ม.รทก.)</p>
                {/* ตลิ่งซ้าย {leftBank.toFixed(1)} ม. ({(leftBank + 304).toFixed(1)} ม.ทรก.) */}
            </div> 


            <div
                className="absolute left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-2 py-1 rounded text-xs flex flex-col items-center justify-center text-center"
                style={{ bottom: `${waterLevelPercent+2}%` }}
            >
                ระดับน้ำ {currentLevel.toFixed(2)} ม. <p>( {(bm+currentLevel).toFixed(2)} ม.รทก.)</p>
            </div>
        </div>
    )
}
