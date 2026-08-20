/** Country centroids for Globle (equirectangular map). */
export interface GlobleCountry {
  id: string
  name: string
  lat: number
  lon: number
  aliases?: string[]
}

export const GLOBLE_COUNTRIES: GlobleCountry[] = [
  {
    "id": "AF",
    "name": "Afghanistan",
    "lat": 33,
    "lon": 65
  },
  {
    "id": "AL",
    "name": "Albania",
    "lat": 41,
    "lon": 20
  },
  {
    "id": "DZ",
    "name": "Algeria",
    "lat": 28,
    "lon": 3
  },
  {
    "id": "AS",
    "name": "American Samoa",
    "lat": -14.3333,
    "lon": -170
  },
  {
    "id": "AD",
    "name": "Andorra",
    "lat": 42.5,
    "lon": 1.6
  },
  {
    "id": "AO",
    "name": "Angola",
    "lat": -12.5,
    "lon": 18.5
  },
  {
    "id": "AI",
    "name": "Anguilla",
    "lat": 18.25,
    "lon": -63.1667
  },
  {
    "id": "AG",
    "name": "Antigua and Barbuda",
    "lat": 17.05,
    "lon": -61.8
  },
  {
    "id": "AR",
    "name": "Argentina",
    "lat": -34,
    "lon": -64
  },
  {
    "id": "AM",
    "name": "Armenia",
    "lat": 40,
    "lon": 45
  },
  {
    "id": "AW",
    "name": "Aruba",
    "lat": 12.5,
    "lon": -69.9667
  },
  {
    "id": "AU",
    "name": "Australia",
    "lat": -27,
    "lon": 133
  },
  {
    "id": "AT",
    "name": "Austria",
    "lat": 47.3333,
    "lon": 13.3333
  },
  {
    "id": "AZ",
    "name": "Azerbaijan",
    "lat": 40.5,
    "lon": 47.5
  },
  {
    "id": "BS",
    "name": "Bahamas",
    "lat": 24.25,
    "lon": -76
  },
  {
    "id": "BH",
    "name": "Bahrain",
    "lat": 26,
    "lon": 50.55
  },
  {
    "id": "BD",
    "name": "Bangladesh",
    "lat": 24,
    "lon": 90
  },
  {
    "id": "BB",
    "name": "Barbados",
    "lat": 13.1667,
    "lon": -59.5333
  },
  {
    "id": "BY",
    "name": "Belarus",
    "lat": 53,
    "lon": 28
  },
  {
    "id": "BE",
    "name": "Belgium",
    "lat": 50.8333,
    "lon": 4
  },
  {
    "id": "BZ",
    "name": "Belize",
    "lat": 17.25,
    "lon": -88.75
  },
  {
    "id": "BJ",
    "name": "Benin",
    "lat": 9.5,
    "lon": 2.25
  },
  {
    "id": "BM",
    "name": "Bermuda",
    "lat": 32.3333,
    "lon": -64.75
  },
  {
    "id": "BT",
    "name": "Bhutan",
    "lat": 27.5,
    "lon": 90.5
  },
  {
    "id": "BO",
    "name": "Bolivia",
    "lat": -17,
    "lon": -65,
    "aliases": [
      "Bolivia, Plurinational State of"
    ]
  },
  {
    "id": "BA",
    "name": "Bosnia and Herzegovina",
    "lat": 44,
    "lon": 18
  },
  {
    "id": "BW",
    "name": "Botswana",
    "lat": -22,
    "lon": 24
  },
  {
    "id": "BR",
    "name": "Brazil",
    "lat": -10,
    "lon": -55
  },
  {
    "id": "VG",
    "name": "British Virgin Islands",
    "lat": 18.5,
    "lon": -64.5
  },
  {
    "id": "BN",
    "name": "Brunei",
    "lat": 4.5,
    "lon": 114.6667,
    "aliases": [
      "Brunei Darussalam"
    ]
  },
  {
    "id": "BG",
    "name": "Bulgaria",
    "lat": 43,
    "lon": 25
  },
  {
    "id": "BF",
    "name": "Burkina Faso",
    "lat": 13,
    "lon": -2
  },
  {
    "id": "BI",
    "name": "Burundi",
    "lat": -3.5,
    "lon": 30
  },
  {
    "id": "CV",
    "name": "Cabo Verde",
    "lat": 16,
    "lon": -24,
    "aliases": [
      "Cape Verde"
    ]
  },
  {
    "id": "KH",
    "name": "Cambodia",
    "lat": 13,
    "lon": 105
  },
  {
    "id": "CM",
    "name": "Cameroon",
    "lat": 6,
    "lon": 12
  },
  {
    "id": "CA",
    "name": "Canada",
    "lat": 60,
    "lon": -95
  },
  {
    "id": "KY",
    "name": "Cayman Islands",
    "lat": 19.5,
    "lon": -80.5
  },
  {
    "id": "CF",
    "name": "Central African Republic",
    "lat": 7,
    "lon": 21
  },
  {
    "id": "TD",
    "name": "Chad",
    "lat": 15,
    "lon": 19
  },
  {
    "id": "CL",
    "name": "Chile",
    "lat": -30,
    "lon": -71
  },
  {
    "id": "CN",
    "name": "China",
    "lat": 35,
    "lon": 105
  },
  {
    "id": "CO",
    "name": "Colombia",
    "lat": 4,
    "lon": -72
  },
  {
    "id": "KM",
    "name": "Comoros",
    "lat": -12.1667,
    "lon": 44.25
  },
  {
    "id": "CK",
    "name": "Cook Islands",
    "lat": -21.2333,
    "lon": -159.7667
  },
  {
    "id": "CR",
    "name": "Costa Rica",
    "lat": 10,
    "lon": -84
  },
  {
    "id": "HR",
    "name": "Croatia",
    "lat": 45.1667,
    "lon": 15.5
  },
  {
    "id": "CU",
    "name": "Cuba",
    "lat": 21.5,
    "lon": -80
  },
  {
    "id": "CY",
    "name": "Cyprus",
    "lat": 35,
    "lon": 33
  },
  {
    "id": "CZ",
    "name": "Czechia",
    "lat": 49.75,
    "lon": 15.5,
    "aliases": [
      "Czech Republic"
    ]
  },
  {
    "id": "DK",
    "name": "Denmark",
    "lat": 56,
    "lon": 10
  },
  {
    "id": "DJ",
    "name": "Djibouti",
    "lat": 11.5,
    "lon": 43
  },
  {
    "id": "DM",
    "name": "Dominica",
    "lat": 15.4167,
    "lon": -61.3333
  },
  {
    "id": "DO",
    "name": "Dominican Republic",
    "lat": 19,
    "lon": -70.6667
  },
  {
    "id": "CD",
    "name": "DR Congo",
    "lat": 0,
    "lon": 25,
    "aliases": [
      "Democratic Republic of the Congo",
      "DRC",
      "Congo-Kinshasa"
    ]
  },
  {
    "id": "EC",
    "name": "Ecuador",
    "lat": -2,
    "lon": -77.5
  },
  {
    "id": "EG",
    "name": "Egypt",
    "lat": 27,
    "lon": 30
  },
  {
    "id": "SV",
    "name": "El Salvador",
    "lat": 13.8333,
    "lon": -88.9167
  },
  {
    "id": "GQ",
    "name": "Equatorial Guinea",
    "lat": 2,
    "lon": 10
  },
  {
    "id": "ER",
    "name": "Eritrea",
    "lat": 15,
    "lon": 39
  },
  {
    "id": "EE",
    "name": "Estonia",
    "lat": 59,
    "lon": 26
  },
  {
    "id": "SZ",
    "name": "Eswatini",
    "lat": -26.5,
    "lon": 31.5,
    "aliases": [
      "Swaziland"
    ]
  },
  {
    "id": "ET",
    "name": "Ethiopia",
    "lat": 8,
    "lon": 38
  },
  {
    "id": "FK",
    "name": "Falkland Islands",
    "lat": -51.75,
    "lon": -59
  },
  {
    "id": "FO",
    "name": "Faroe Islands",
    "lat": 62,
    "lon": -7
  },
  {
    "id": "FJ",
    "name": "Fiji",
    "lat": -18,
    "lon": 175
  },
  {
    "id": "FI",
    "name": "Finland",
    "lat": 64,
    "lon": 26
  },
  {
    "id": "FR",
    "name": "France",
    "lat": 46,
    "lon": 2
  },
  {
    "id": "GF",
    "name": "French Guiana",
    "lat": 4,
    "lon": -53
  },
  {
    "id": "PF",
    "name": "French Polynesia",
    "lat": -15,
    "lon": -140
  },
  {
    "id": "GA",
    "name": "Gabon",
    "lat": -1,
    "lon": 11.75
  },
  {
    "id": "GM",
    "name": "Gambia",
    "lat": 13.4667,
    "lon": -16.5667
  },
  {
    "id": "GE",
    "name": "Georgia",
    "lat": 42,
    "lon": 43.5
  },
  {
    "id": "DE",
    "name": "Germany",
    "lat": 51,
    "lon": 9
  },
  {
    "id": "GH",
    "name": "Ghana",
    "lat": 8,
    "lon": -2
  },
  {
    "id": "GI",
    "name": "Gibraltar",
    "lat": 36.1833,
    "lon": -5.3667
  },
  {
    "id": "GR",
    "name": "Greece",
    "lat": 39,
    "lon": 22
  },
  {
    "id": "GL",
    "name": "Greenland",
    "lat": 72,
    "lon": -40
  },
  {
    "id": "GD",
    "name": "Grenada",
    "lat": 12.1167,
    "lon": -61.6667
  },
  {
    "id": "GP",
    "name": "Guadeloupe",
    "lat": 16.25,
    "lon": -61.5833
  },
  {
    "id": "GU",
    "name": "Guam",
    "lat": 13.4667,
    "lon": 144.7833
  },
  {
    "id": "GT",
    "name": "Guatemala",
    "lat": 15.5,
    "lon": -90.25
  },
  {
    "id": "GG",
    "name": "Guernsey",
    "lat": 49.5,
    "lon": -2.56
  },
  {
    "id": "GN",
    "name": "Guinea",
    "lat": 11,
    "lon": -10
  },
  {
    "id": "GW",
    "name": "Guinea-Bissau",
    "lat": 12,
    "lon": -15
  },
  {
    "id": "GY",
    "name": "Guyana",
    "lat": 5,
    "lon": -59
  },
  {
    "id": "HT",
    "name": "Haiti",
    "lat": 19,
    "lon": -72.4167
  },
  {
    "id": "HN",
    "name": "Honduras",
    "lat": 15,
    "lon": -86.5
  },
  {
    "id": "HK",
    "name": "Hong Kong",
    "lat": 22.25,
    "lon": 114.1667
  },
  {
    "id": "HU",
    "name": "Hungary",
    "lat": 47,
    "lon": 20
  },
  {
    "id": "IS",
    "name": "Iceland",
    "lat": 65,
    "lon": -18
  },
  {
    "id": "IN",
    "name": "India",
    "lat": 20,
    "lon": 77
  },
  {
    "id": "ID",
    "name": "Indonesia",
    "lat": -5,
    "lon": 120
  },
  {
    "id": "IR",
    "name": "Iran",
    "lat": 32,
    "lon": 53,
    "aliases": [
      "Iran, Islamic Republic of"
    ]
  },
  {
    "id": "IQ",
    "name": "Iraq",
    "lat": 33,
    "lon": 44
  },
  {
    "id": "IE",
    "name": "Ireland",
    "lat": 53,
    "lon": -8
  },
  {
    "id": "IM",
    "name": "Isle of Man",
    "lat": 54.23,
    "lon": -4.55
  },
  {
    "id": "IL",
    "name": "Israel",
    "lat": 31.5,
    "lon": 34.75
  },
  {
    "id": "IT",
    "name": "Italy",
    "lat": 42.8333,
    "lon": 12.8333
  },
  {
    "id": "CI",
    "name": "Ivory Coast",
    "lat": 8,
    "lon": -5,
    "aliases": [
      "Côte d'Ivoire",
      "Cote d'Ivoire"
    ]
  },
  {
    "id": "JM",
    "name": "Jamaica",
    "lat": 18.25,
    "lon": -77.5
  },
  {
    "id": "JP",
    "name": "Japan",
    "lat": 36,
    "lon": 138
  },
  {
    "id": "JE",
    "name": "Jersey",
    "lat": 49.21,
    "lon": -2.13
  },
  {
    "id": "JO",
    "name": "Jordan",
    "lat": 31,
    "lon": 36
  },
  {
    "id": "KZ",
    "name": "Kazakhstan",
    "lat": 48,
    "lon": 68
  },
  {
    "id": "KE",
    "name": "Kenya",
    "lat": 1,
    "lon": 38
  },
  {
    "id": "KI",
    "name": "Kiribati",
    "lat": 1.4167,
    "lon": 173
  },
  {
    "id": "KW",
    "name": "Kuwait",
    "lat": 29.3375,
    "lon": 47.6581
  },
  {
    "id": "KG",
    "name": "Kyrgyzstan",
    "lat": 41,
    "lon": 75
  },
  {
    "id": "LA",
    "name": "Laos",
    "lat": 18,
    "lon": 105,
    "aliases": [
      "Lao People's Democratic Republic"
    ]
  },
  {
    "id": "LV",
    "name": "Latvia",
    "lat": 57,
    "lon": 25
  },
  {
    "id": "LB",
    "name": "Lebanon",
    "lat": 33.8333,
    "lon": 35.8333
  },
  {
    "id": "LS",
    "name": "Lesotho",
    "lat": -29.5,
    "lon": 28.5
  },
  {
    "id": "LR",
    "name": "Liberia",
    "lat": 6.5,
    "lon": -9.5
  },
  {
    "id": "LY",
    "name": "Libya",
    "lat": 25,
    "lon": 17,
    "aliases": [
      "Libyan Arab Jamahiriya"
    ]
  },
  {
    "id": "LI",
    "name": "Liechtenstein",
    "lat": 47.1667,
    "lon": 9.5333
  },
  {
    "id": "LT",
    "name": "Lithuania",
    "lat": 56,
    "lon": 24
  },
  {
    "id": "LU",
    "name": "Luxembourg",
    "lat": 49.75,
    "lon": 6.1667
  },
  {
    "id": "MO",
    "name": "Macau",
    "lat": 22.1667,
    "lon": 113.55
  },
  {
    "id": "MG",
    "name": "Madagascar",
    "lat": -20,
    "lon": 47
  },
  {
    "id": "MW",
    "name": "Malawi",
    "lat": -13.5,
    "lon": 34
  },
  {
    "id": "MY",
    "name": "Malaysia",
    "lat": 2.5,
    "lon": 112.5
  },
  {
    "id": "MV",
    "name": "Maldives",
    "lat": 3.25,
    "lon": 73
  },
  {
    "id": "ML",
    "name": "Mali",
    "lat": 17,
    "lon": -4
  },
  {
    "id": "MT",
    "name": "Malta",
    "lat": 35.8333,
    "lon": 14.5833
  },
  {
    "id": "MH",
    "name": "Marshall Islands",
    "lat": 9,
    "lon": 168
  },
  {
    "id": "MQ",
    "name": "Martinique",
    "lat": 14.6667,
    "lon": -61
  },
  {
    "id": "MR",
    "name": "Mauritania",
    "lat": 20,
    "lon": -12
  },
  {
    "id": "MU",
    "name": "Mauritius",
    "lat": -20.2833,
    "lon": 57.55
  },
  {
    "id": "YT",
    "name": "Mayotte",
    "lat": -12.8333,
    "lon": 45.1667
  },
  {
    "id": "MX",
    "name": "Mexico",
    "lat": 23,
    "lon": -102
  },
  {
    "id": "FM",
    "name": "Micronesia",
    "lat": 6.9167,
    "lon": 158.25,
    "aliases": [
      "Micronesia, Federated States of"
    ]
  },
  {
    "id": "MD",
    "name": "Moldova",
    "lat": 47,
    "lon": 29,
    "aliases": [
      "Moldova, Republic of"
    ]
  },
  {
    "id": "MC",
    "name": "Monaco",
    "lat": 43.7333,
    "lon": 7.4
  },
  {
    "id": "MN",
    "name": "Mongolia",
    "lat": 46,
    "lon": 105
  },
  {
    "id": "ME",
    "name": "Montenegro",
    "lat": 42,
    "lon": 19
  },
  {
    "id": "MS",
    "name": "Montserrat",
    "lat": 16.75,
    "lon": -62.2
  },
  {
    "id": "MA",
    "name": "Morocco",
    "lat": 32,
    "lon": -5
  },
  {
    "id": "MZ",
    "name": "Mozambique",
    "lat": -18.25,
    "lon": 35
  },
  {
    "id": "MM",
    "name": "Myanmar",
    "lat": 22,
    "lon": 98,
    "aliases": [
      "Burma"
    ]
  },
  {
    "id": "NA",
    "name": "Namibia",
    "lat": -22,
    "lon": 17
  },
  {
    "id": "NR",
    "name": "Nauru",
    "lat": -0.5333,
    "lon": 166.9167
  },
  {
    "id": "NP",
    "name": "Nepal",
    "lat": 28,
    "lon": 84
  },
  {
    "id": "NL",
    "name": "Netherlands",
    "lat": 52.5,
    "lon": 5.75,
    "aliases": [
      "Holland"
    ]
  },
  {
    "id": "AN",
    "name": "Netherlands Antilles",
    "lat": 12.25,
    "lon": -68.75
  },
  {
    "id": "NC",
    "name": "New Caledonia",
    "lat": -21.5,
    "lon": 165.5
  },
  {
    "id": "NZ",
    "name": "New Zealand",
    "lat": -41,
    "lon": 174
  },
  {
    "id": "NI",
    "name": "Nicaragua",
    "lat": 13,
    "lon": -85
  },
  {
    "id": "NE",
    "name": "Niger",
    "lat": 16,
    "lon": 8
  },
  {
    "id": "NG",
    "name": "Nigeria",
    "lat": 10,
    "lon": 8
  },
  {
    "id": "NU",
    "name": "Niue",
    "lat": -19.0333,
    "lon": -169.8667
  },
  {
    "id": "KP",
    "name": "North Korea",
    "lat": 40,
    "lon": 127,
    "aliases": [
      "DPRK"
    ]
  },
  {
    "id": "MK",
    "name": "North Macedonia",
    "lat": 41.8333,
    "lon": 22,
    "aliases": [
      "Macedonia"
    ]
  },
  {
    "id": "MP",
    "name": "Northern Mariana Islands",
    "lat": 15.2,
    "lon": 145.75
  },
  {
    "id": "NO",
    "name": "Norway",
    "lat": 62,
    "lon": 10
  },
  {
    "id": "OM",
    "name": "Oman",
    "lat": 21,
    "lon": 57
  },
  {
    "id": "PK",
    "name": "Pakistan",
    "lat": 30,
    "lon": 70
  },
  {
    "id": "PW",
    "name": "Palau",
    "lat": 7.5,
    "lon": 134.5
  },
  {
    "id": "PS",
    "name": "Palestine",
    "lat": 32,
    "lon": 35.25,
    "aliases": [
      "Palestinian Territory, Occupied"
    ]
  },
  {
    "id": "PA",
    "name": "Panama",
    "lat": 9,
    "lon": -80
  },
  {
    "id": "PG",
    "name": "Papua New Guinea",
    "lat": -6,
    "lon": 147
  },
  {
    "id": "PY",
    "name": "Paraguay",
    "lat": -23,
    "lon": -58
  },
  {
    "id": "PE",
    "name": "Peru",
    "lat": -10,
    "lon": -76
  },
  {
    "id": "PH",
    "name": "Philippines",
    "lat": 13,
    "lon": 122
  },
  {
    "id": "PL",
    "name": "Poland",
    "lat": 52,
    "lon": 20
  },
  {
    "id": "PT",
    "name": "Portugal",
    "lat": 39.5,
    "lon": -8
  },
  {
    "id": "PR",
    "name": "Puerto Rico",
    "lat": 18.25,
    "lon": -66.5
  },
  {
    "id": "QA",
    "name": "Qatar",
    "lat": 25.5,
    "lon": 51.25
  },
  {
    "id": "CG",
    "name": "Republic of the Congo",
    "lat": -1,
    "lon": 15,
    "aliases": [
      "Congo",
      "Congo-Brazzaville"
    ]
  },
  {
    "id": "RE",
    "name": "Reunion",
    "lat": -21.1,
    "lon": 55.6
  },
  {
    "id": "RO",
    "name": "Romania",
    "lat": 46,
    "lon": 25
  },
  {
    "id": "RU",
    "name": "Russia",
    "lat": 60,
    "lon": 100,
    "aliases": [
      "Russian Federation"
    ]
  },
  {
    "id": "RW",
    "name": "Rwanda",
    "lat": -2,
    "lon": 30
  },
  {
    "id": "SH",
    "name": "Saint Helena",
    "lat": -15.9333,
    "lon": -5.7
  },
  {
    "id": "KN",
    "name": "Saint Kitts and Nevis",
    "lat": 17.3333,
    "lon": -62.75
  },
  {
    "id": "LC",
    "name": "Saint Lucia",
    "lat": 13.8833,
    "lon": -61.1333
  },
  {
    "id": "PM",
    "name": "Saint Pierre and Miquelon",
    "lat": 46.8333,
    "lon": -56.3333
  },
  {
    "id": "VC",
    "name": "Saint Vincent and the Grenadines",
    "lat": 13.25,
    "lon": -61.2
  },
  {
    "id": "WS",
    "name": "Samoa",
    "lat": -13.5833,
    "lon": -172.3333
  },
  {
    "id": "SM",
    "name": "San Marino",
    "lat": 43.7667,
    "lon": 12.4167
  },
  {
    "id": "ST",
    "name": "Sao Tome and Principe",
    "lat": 1,
    "lon": 7
  },
  {
    "id": "SA",
    "name": "Saudi Arabia",
    "lat": 25,
    "lon": 45
  },
  {
    "id": "SN",
    "name": "Senegal",
    "lat": 14,
    "lon": -14
  },
  {
    "id": "RS",
    "name": "Serbia",
    "lat": 44,
    "lon": 21
  },
  {
    "id": "SC",
    "name": "Seychelles",
    "lat": -4.5833,
    "lon": 55.6667
  },
  {
    "id": "SL",
    "name": "Sierra Leone",
    "lat": 8.5,
    "lon": -11.5
  },
  {
    "id": "SG",
    "name": "Singapore",
    "lat": 1.3667,
    "lon": 103.8
  },
  {
    "id": "SK",
    "name": "Slovakia",
    "lat": 48.6667,
    "lon": 19.5
  },
  {
    "id": "SI",
    "name": "Slovenia",
    "lat": 46,
    "lon": 15
  },
  {
    "id": "SB",
    "name": "Solomon Islands",
    "lat": -8,
    "lon": 159
  },
  {
    "id": "SO",
    "name": "Somalia",
    "lat": 10,
    "lon": 49
  },
  {
    "id": "ZA",
    "name": "South Africa",
    "lat": -29,
    "lon": 24
  },
  {
    "id": "KR",
    "name": "South Korea",
    "lat": 37,
    "lon": 127.5,
    "aliases": [
      "Korea",
      "Republic of Korea"
    ]
  },
  {
    "id": "ES",
    "name": "Spain",
    "lat": 40,
    "lon": -4
  },
  {
    "id": "LK",
    "name": "Sri Lanka",
    "lat": 7,
    "lon": 81
  },
  {
    "id": "SD",
    "name": "Sudan",
    "lat": 15,
    "lon": 30
  },
  {
    "id": "SR",
    "name": "Suriname",
    "lat": 4,
    "lon": -56
  },
  {
    "id": "SE",
    "name": "Sweden",
    "lat": 62,
    "lon": 15
  },
  {
    "id": "CH",
    "name": "Switzerland",
    "lat": 47,
    "lon": 8
  },
  {
    "id": "SY",
    "name": "Syria",
    "lat": 35,
    "lon": 38,
    "aliases": [
      "Syrian Arab Republic"
    ]
  },
  {
    "id": "TW",
    "name": "Taiwan",
    "lat": 23.5,
    "lon": 121,
    "aliases": [
      "Taiwan, Province of China"
    ]
  },
  {
    "id": "TJ",
    "name": "Tajikistan",
    "lat": 39,
    "lon": 71
  },
  {
    "id": "TZ",
    "name": "Tanzania",
    "lat": -6,
    "lon": 35,
    "aliases": [
      "Tanzania, United Republic of"
    ]
  },
  {
    "id": "TH",
    "name": "Thailand",
    "lat": 15,
    "lon": 100
  },
  {
    "id": "TL",
    "name": "Timor-Leste",
    "lat": -8.55,
    "lon": 125.5167
  },
  {
    "id": "TG",
    "name": "Togo",
    "lat": 8,
    "lon": 1.1667
  },
  {
    "id": "TO",
    "name": "Tonga",
    "lat": -20,
    "lon": -175
  },
  {
    "id": "TT",
    "name": "Trinidad and Tobago",
    "lat": 11,
    "lon": -61
  },
  {
    "id": "TN",
    "name": "Tunisia",
    "lat": 34,
    "lon": 9
  },
  {
    "id": "TR",
    "name": "Turkey",
    "lat": 39,
    "lon": 35,
    "aliases": [
      "Türkiye"
    ]
  },
  {
    "id": "TM",
    "name": "Turkmenistan",
    "lat": 40,
    "lon": 60
  },
  {
    "id": "TC",
    "name": "Turks and Caicos Islands",
    "lat": 21.75,
    "lon": -71.5833
  },
  {
    "id": "TV",
    "name": "Tuvalu",
    "lat": -8,
    "lon": 178
  },
  {
    "id": "VI",
    "name": "U.S. Virgin Islands",
    "lat": 18.3333,
    "lon": -64.8333
  },
  {
    "id": "UG",
    "name": "Uganda",
    "lat": 1,
    "lon": 32
  },
  {
    "id": "UA",
    "name": "Ukraine",
    "lat": 49,
    "lon": 32
  },
  {
    "id": "AE",
    "name": "United Arab Emirates",
    "lat": 24,
    "lon": 54,
    "aliases": [
      "UAE"
    ]
  },
  {
    "id": "GB",
    "name": "United Kingdom",
    "lat": 54,
    "lon": -2,
    "aliases": [
      "UK",
      "Britain",
      "Great Britain",
      "England"
    ]
  },
  {
    "id": "US",
    "name": "United States",
    "lat": 38,
    "lon": -97,
    "aliases": [
      "USA",
      "America",
      "United States of America"
    ]
  },
  {
    "id": "UY",
    "name": "Uruguay",
    "lat": -33,
    "lon": -56
  },
  {
    "id": "UZ",
    "name": "Uzbekistan",
    "lat": 41,
    "lon": 64
  },
  {
    "id": "VU",
    "name": "Vanuatu",
    "lat": -16,
    "lon": 167
  },
  {
    "id": "VA",
    "name": "Vatican City",
    "lat": 41.9,
    "lon": 12.45,
    "aliases": [
      "Vatican",
      "Holy See"
    ]
  },
  {
    "id": "VE",
    "name": "Venezuela",
    "lat": 8,
    "lon": -66,
    "aliases": [
      "Venezuela, Bolivarian Republic of"
    ]
  },
  {
    "id": "VN",
    "name": "Vietnam",
    "lat": 16,
    "lon": 106,
    "aliases": [
      "Viet Nam"
    ]
  },
  {
    "id": "EH",
    "name": "Western Sahara",
    "lat": 24.5,
    "lon": -13
  },
  {
    "id": "YE",
    "name": "Yemen",
    "lat": 15,
    "lon": 48
  },
  {
    "id": "ZM",
    "name": "Zambia",
    "lat": -15,
    "lon": 30
  },
  {
    "id": "ZW",
    "name": "Zimbabwe",
    "lat": -20,
    "lon": 30
  }
]
