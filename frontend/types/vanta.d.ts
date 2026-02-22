declare module 'vanta/dist/vanta.fog.min' {
    import * as THREE from 'three'

    interface VantaFogOptions {
        el: HTMLElement | string
        THREE?: typeof THREE
        mouseControls?: boolean
        touchControls?: boolean
        gyroControls?: boolean
        minHeight?: number
        minWidth?: number
        highlightColor?: number
        midtoneColor?: number
        lowlightColor?: number
        baseColor?: number
        blurFactor?: number
        speed?: number
        zoom?: number
        [key: string]: any
    }

    function FOG(options: VantaFogOptions): { destroy: () => void }
    export default FOG
}
