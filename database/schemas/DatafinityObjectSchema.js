const mongoose = require( 'mongoose' );
const Schema = mongoose.Schema;

const DatafinityObjectSchema = new Schema( {
    user: { type: String, required: true },
    object_type: { type: String, required: true },
    authority: String,
    asins: String,
    brand: String,
    categories: { type: [ String ], default: [] },
    colors: { type: [ String ], default: [] },
    count: String,
    dateAdded: String,
    dateUpdated: String,
    descriptions: [ {
        dateSeen: String,
        sourceURLs: { type: [ String ], default: [] },
        value: String
    } ],
    dimension: String,
    domains: { type: [ String ], default: [] },
    ean: { type: [ String ], default: [] },
    ean13: String,
    ean8: String,
    features: [ {
        key: String,
        replace: String,
        value: { type: [ String ], default: [] }
    } ],
    flavors: { type: [ String ], default: [] },
    gtins: { type: [ String ], default: [] },
    imageURLs: { type: [ String ], default: [] },
    isbn: String,
    keys: { type: [ String ], default: [] },
    manufacturer: String,
    manufacturerNumber: String,
    merchants: [ {
        address: String,
        availability: String,
        city: String,
        country: String,
        dateSeen: { type: [ String ], default: [] },
        isPrivateSeller: Boolean,
        name: String,
        postalCode: String,
        province: String,
        phone: String
    } ],
    mostRecentPriceAmount: Number,
    mostRecentPriceAvailability: String,
    mostRecentPriceByDomain: [ {
        amount: Number,
        availability: String,
        currency: String,
        isSale: String,
        domain: String,
        sourceURL: String,
        date: String,
        firstDateSeen: String
    } ],
    mostRecentPriceColor: String,
    mostRecentPriceCondition: String,
    mostRecentPriceCurrency: String,
    mostRecentPriceDate: String,
    mostRecentPriceDomain: String,
    mostRecentPriceIsSale: String,
    mostRecentPriceSize: String,
    mostRecentPriceSourceURL: String,
    name: String,
    prices: [ {
        amountMin: Number,
        amountMax: Number,
        availability: String,
        color: String,
        condition: String,
        count: String,
        currency: String,
        dateSeen: { type: [ String ], default: [] },
        flavor: String,
        isSale: String,
        isSold: String,
        merchant: String,
        offer: String,
        returnPolicy: String,
        shipping: String,
        size: String,
        sourceURLs: { type: [ String ], default: [] }
    } ],
    primaryCategories: { type: [ String ], default: [] },
    primaryImageURLs: { type: [ String ], default: [] },
    quantities: [ {
        dateSeen: { type: [ String ], default: [] },
        sourceURLs: { type: [ String ], default: [] },
        value: Number

    } ],
    reviews: [ {
        date: String,
        dateSeen: String,
        didPurchase: Boolean,
        doRecommend: Boolean,
        id: String,
        numHelpful: Number,
        rating: Number,
        sourceURLs: { type: [ String ], default: [] },
        text: String,
        title: String,
        userCity: String,
        username: String,
        userProvince: String
    } ],
    sdsURLs: { type: [ String ], default: [] },
    secondaryCategories: { type: [ String ], default: [] },
    sizes: { type: [ String ], default: [] },
    skus: [ {
        sourceURLs: { type: [ String ], default: [] },
        value: String
    } ],
    sourceURLs: { type: [ String ], default: [] },
    stockNum: String,
    taxonomy: { type: [ String ], default: [] },
    taxonomyLevel1: { type: [ String ], default: [] },
    taxonomyLevel2: { type: [ String ], default: [] },
    taxonomyLevel3: { type: [ String ], default: [] },
    taxonomyLevel4: { type: [ String ], default: [] },
    taxonomyLevel5: { type: [ String ], default: [] },
    taxonomyLevel6: { type: [ String ], default: [] },
    taxonomyLevel7: { type: [ String ], default: [] },
    taxonomyLevel8: { type: [ String ], default: [] },
    taxonomyLevel9: { type: [ String ], default: [] },
    upc: { type: [ String ], default: [] },
    upca: String,
    upce: String,
    vin: String,
    websiteIDs: { type: [ String ], default: [] },
    weight: String,
    authorCreated: { type: Boolean, default: false },
    publisherCreated: { type: Boolean, default: false }
}, {
    strict: false, timestamps: true, versionKey: false, toObject: {
        virtuals: true
    }
} );

const DatafinityObjectModel = mongoose.model( 'datafinity_object', DatafinityObjectSchema );

module.exports = DatafinityObjectModel;
