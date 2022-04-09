

export interface AssetAttribute {

    trait_type: string
    display_type?: string
    value: string | number | boolean

}

export interface IAssetMetadata {

    name: string 
    description: string 
    external_url: string 
    image: string 
    attributes: AssetAttribute[]
    background_color?: string
    animation_url?: string 
    youtube_url?: string

}