import StationDetailClient from "./StationDetailClient"

export async function generateStaticParams() {
    return [
        { id: "1" },
        { id: "2" },
        { id: "3" },
        { id: "4" },
        { id: "5" },
    ]
}

export default function StationPage({ params }: any) {
    return <StationDetailClient stationId={params.id} />
}
