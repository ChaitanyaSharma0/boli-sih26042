import { useState } from "react";
import { speak } from "../api";
import AudioPlayer from "./AudioPlayer";

// Primary FLN (Foundational Literacy & Numeracy) Bilingual Flashcards
// Designed for Jharkhand primary classrooms (Classes 1–3)
const FOUNDATION_CARDS = [
  {
    id: "water",
    category: "प्रकृति (Nature)",
    icon: "water_drop",
    color: "#0288D1",
    hindi: "जल / पानी",
    meaning: "Water — जीवन का आधार",
    dialects: {
      sat: {
        script: "ᱫᱟᱜ",
        translit: "Daag",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱫᱟᱜ",
        translit: "Daa",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "ᱫᱟᱻ",
        translit: "Da:",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "अम्म",
        translit: "Amm",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "पानी",
        translit: "Paani",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "कुएं का पानी साफ है। (ᱫᱟᱜ ᱥᱟᱯᱷᱟ ᱜᱮᱭᱟ)",
  },
  {
    id: "tree",
    category: "प्रकृति (Nature)",
    icon: "park",
    color: "#2E7D32",
    hindi: "पेड़ / वृक्ष",
    meaning: "Tree — सखुआ और महुआ के पेड़",
    dialects: {
      sat: {
        script: "ᱫᱟᱨᱮ",
        translit: "Dare",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱫᱟᱨᱩ",
        translit: "Daru",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "दारु",
        translit: "Daaru",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "मन्न",
        translit: "Mann",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "गाछ",
        translit: "Gaachh",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "जंगल में बड़े पेड़ हैं। (ᱵᱤᱨ ᱨᱮ ᱢᱟᱨᱟᱝ ᱫᱟᱨᱮ ᱢᱮᱱᱟᱜᱼᱟ)",
  },
  {
    id: "sun",
    category: "प्रकृति (Nature)",
    icon: "wb_sunny",
    color: "#F57C00",
    hindi: "सूरज / सूर्य",
    meaning: "Sun — सुबह की धूप",
    dialects: {
      sat: {
        script: "ᱥᱤᱧ / ᱵᱮᱲᱟ",
        translit: "Sin / Beda",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱥᱤᱝᱜᱤ",
        translit: "Singi",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "सिंगी",
        translit: "Singi",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "बीड़ी",
        translit: "Bidi",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "सुरुज",
        translit: "Suruj",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "पूरब से सूरज निकला। (ᱥᱤᱧ ᱪᱟᱸᱫᱚ ᱨᱟᱠᱟᱵ ᱮᱱᱟ)",
  },
  {
    id: "mother",
    category: "परिवार (Family)",
    icon: "family_restroom",
    color: "#C2185B",
    hindi: "माँ / माता",
    meaning: "Mother — स्नेह और दुलार",
    dialects: {
      sat: {
        script: "ᱟᱭᱳ / ᱮᱸᱜᱟᱛ",
        translit: "Ayo / Engat",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱮᱸᱜᱟ",
        translit: "Enga",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "एंगा",
        translit: "Enga",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "अयो",
        translit: "Ayo",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "माय",
        translit: "Maay",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "माँ मुझे खाना खिलाती है। (ᱟᱭᱳ ᱤᱧ ᱫᱟᱠᱟᱭ ᱮᱢᱟᱹᱧ ᱠᱟᱱᱟ)",
  },
  {
    id: "friend",
    category: "मित्रता (Friendship)",
    icon: "diversity_1",
    color: "#7B1FA2",
    hindi: "दोस्त / सखा",
    meaning: "Friend — कक्षा में साथी",
    dialects: {
      sat: {
        script: "ᱜᱟᱛᱮ",
        translit: "Gate",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱜᱟᱛᱮ",
        translit: "Gate",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "गाते",
        translit: "Gate",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "संगी",
        translit: "Sangi",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "संगी / जोहारिया",
        translit: "Sangi",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "हम सब अच्छे दोस्त हैं। (ᱟᱞᱮ ᱵᱮᱥ ᱜᱟᱛᱮ ᱠᱟᱱᱟᱞᱮ)",
  },
  {
    id: "school",
    category: "विद्यालय (School)",
    icon: "school",
    color: "#E65100",
    hindi: "विद्यालय / स्कूल",
    meaning: "School — ज्ञान का घर",
    dialects: {
      sat: {
        script: "ᱟᱥᱲᱟ",
        translit: "Asda",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱤᱛᱩᱱ ᱟᱥᱲᱟ",
        translit: "Itun Asda",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "इतुन आसड़ा",
        translit: "Itun Asda",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "पढ़ना गढ़ी",
        translit: "Padhna Gadhi",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "इस्कूल",
        translit: "Iskool",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "बच्चे रोज स्कूल जाते हैं। (ᱜᱤᱫᱽᱨᱟᱹ ᱫᱤᱱᱟᱹᱢ ᱟᱥᱲᱟ ᱠᱚ ᱥᱮᱱᱚᱜᱼᱟ)",
  },
  {
    id: "book",
    category: "विद्यालय (School)",
    icon: "menu_book",
    color: "#1565C0",
    hindi: "किताब / पुस्तक",
    meaning: "Book — सुंदर कहानियाँ",
    dialects: {
      sat: {
        script: "ᱯᱩᱛᱷᱤ",
        translit: "Puthi",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱯᱩᱛᱷᱤ",
        translit: "Puthi",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "पुथी",
        translit: "Puthi",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "बिजा",
        translit: "Bija",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "किताब / पोथी",
        translit: "Pothi",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "यह मेरी हिंदी की किताब है। (ᱱᱚᱣᱟ ᱤᱧᱟᱜ ᱯᱩᱛᱷᱤ ᱠᱟᱱᱟ)",
  },
  {
    id: "bird",
    category: "प्रकृति (Nature)",
    icon: "cruelty_free",
    color: "#00796B",
    hindi: "चिड़िया / पक्षी",
    meaning: "Bird — मीठी बोली",
    dialects: {
      sat: {
        script: "ᱪᱮᱸᱬᱮ",
        translit: "Chende",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱪᱮᱸᱬᱮ",
        translit: "Chende",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "चेड़े",
        translit: "Chede",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "ओड़ा",
        translit: "Oda",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "चिरई",
        translit: "Chirai",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "पेड़ पर सुंदर चिड़िया बैठी है। (ᱫᱟᱨᱮ ᱨᱮ ᱪᱮᱸᱬᱮ ᱢᱮᱱᱟᱭᱟ)",
  },
  {
    id: "flower",
    category: "प्रकृति (Nature)",
    icon: "local_florist",
    color: "#E91E63",
    hindi: "फूल / पुष्प",
    meaning: "Flower — पलाश के लाल फूल",
    dialects: {
      sat: {
        script: "ᱵᱟᱦᱟ",
        translit: "Baha",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱵᱟ",
        translit: "Baa",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "बाहा",
        translit: "Baaha",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "पुंप",
        translit: "Pump",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "फूल",
        translit: "Phool",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "जंगल में पलाश के फूल खिले हैं। (ᱵᱤᱨ ᱨᱮ ᱯᱚᱞᱟᱥ ᱵᱟᱦᱟ ᱯᱷᱩᱴᱟᱹᱣ ᱮᱱᱟ)",
  },
  {
    id: "river",
    category: "प्रकृति (Nature)",
    icon: "waves",
    color: "#00ACC1",
    hindi: "नदी / सरिता",
    meaning: "River — बहती धारा (दामोदर/सुवर्णरेखा)",
    dialects: {
      sat: {
        script: "ᱜᱟᱰᱟ",
        translit: "Gada",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱜᱟᱰᱟ",
        translit: "Gada",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "गाड़ा",
        translit: "Gaada",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "खड्ड",
        translit: "Khadd",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "नदी / सोता",
        translit: "Nadi / Sota",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "गाँव के किनारे नदी बहती है। (ᱟᱹᱛᱩ ᱟᱲᱮ ᱛᱮ ᱜᱟᱰᱟ ᱞᱤᱸᱜᱤᱱ ᱠᱟᱱᱟ)",
  },
  {
    id: "moon",
    category: "प्रकृति (Nature)",
    icon: "dark_mode",
    color: "#5C6BC0",
    hindi: "चाँद / चंद्रमा",
    meaning: "Moon — रात की चाँदनी",
    dialects: {
      sat: {
        script: "ᱪᱟᱸᱫᱚ",
        translit: "Chando",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱪᱟᱸᱫᱩ",
        translit: "Chandu",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "चांदु",
        translit: "Chaandu",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "चन्दो",
        translit: "Chando",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "चांद",
        translit: "Chaand",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "रात में चाँद चमकता है। (ᱧᱤᱫᱟᱹ ᱪᱟᱸᱫᱚ ᱡᱩᱞᱩᱜ ᱠᱟᱱᱟ)",
  },
  {
    id: "forest",
    category: "प्रकृति (Nature)",
    icon: "forest",
    color: "#33691E",
    hindi: "जंगल / वन",
    meaning: "Forest — साल और महुआ का वन",
    dialects: {
      sat: {
        script: "ᱵᱤᱨ",
        translit: "Bir",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱵᱤᱨ",
        translit: "Bir",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "बिर",
        translit: "Bir",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "झल",
        translit: "Jhal / Pachhri",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "बोन / झाड़",
        translit: "Bon / Jhaar",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "जंगल से हमें फल और छाया मिलती है। (ᱵᱤᱨ ᱠᱷᱚᱱ ᱟᱞᱮ ᱡᱚ ᱟᱨ ᱩᱢᱩᱞ ᱧᱟᱢᱚᱜᱼᱟ)",
  },
  {
    id: "house",
    category: "परिवार (Family)",
    icon: "cottage",
    color: "#8D6E63",
    hindi: "घर / गृह",
    meaning: "House/Home — हमारा निवास",
    dialects: {
      sat: {
        script: "ᱚᱲᱟᱜ",
        translit: "Oda:",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱚᱣᱟᱜ",
        translit: "Owa:",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "ओड़ाः",
        translit: "Oda:",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "एड़पा",
        translit: "Edpa",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "घर / कुँभा",
        translit: "Ghar",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "हम सब अपने घर में रहते हैं। (ᱟᱞᱮ ᱟᱞᱮᱭᱟᱜ ᱚᱲᱟᱜ ᱨᱮ ᱢᱮᱱᱟᱜ ᱞᱮᱭᱟ)",
  },
  {
    id: "father",
    category: "परिवार (Family)",
    icon: "man",
    color: "#3E2723",
    hindi: "पिता / बाबा",
    meaning: "Father — परिवार के रक्षक",
    dialects: {
      sat: {
        script: "ᱵᱟᱵᱟ / ᱟᱯᱟᱛ",
        translit: "Baba / Apat",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱟᱯᱟ",
        translit: "Apa",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "आपा",
        translit: "Aapa",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "तम्बस",
        translit: "Tambas",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "बाप / बाबाजी",
        translit: "Baap",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "पिताजी खेत में काम करते हैं। (ᱵᱟᱵᱟ ᱠᱷᱮᱛ ᱨᱮ ᱠᱟᱹᱢᱤ ᱠᱟᱱᱟᱭ)",
  },
  {
    id: "child",
    category: "परिवार (Family)",
    icon: "child_care",
    color: "#F06292",
    hindi: "बच्चा / बालक",
    meaning: "Child — नन्हे विद्यार्थी",
    dialects: {
      sat: {
        script: "ᱜᱤᱫᱽᱨᱟᱹ",
        translit: "Gidra",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱦᱳᱱ",
        translit: "Hon",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "होन",
        translit: "Hon",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "खद्दर",
        translit: "Khaddar",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "छौआ",
        translit: "Chhoua",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "बच्चे खेल के मैदान में दौड़ रहे हैं। (ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ ᱮᱱᱮᱡ ᱴᱟᱺᱰᱤ ᱨᱮ ᱠᱚ ᱫᱟᱹᱲ ᱮᱫᱼᱟ)",
  },
  {
    id: "teacher",
    category: "विद्यालय (School)",
    icon: "person_celebrate",
    color: "#1E88E5",
    hindi: "शिक्षक / गुरुजी",
    meaning: "Teacher — ज्ञान देने वाले",
    dialects: {
      sat: {
        script: "ᱥᱮᱪᱮᱫᱤᱭᱟᱹ",
        translit: "Sechediya",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱤᱛᱩᱱᱤᱭᱟᱹ",
        translit: "Ituniya",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "इतुनिया",
        translit: "Ituniya",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "शिक्षकसी",
        translit: "Shikshaksi",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "गुरुजी / मास्टर",
        translit: "Guruji",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "गुरुजी कक्षा में पढ़ा रहे हैं। (ᱥᱮᱪᱮᱫᱤᱭᱟᱹ ᱠᱞᱟᱥ ᱨᱮ ᱯᱟᱲᱦᱟᱣ ᱮᱫ ᱠᱚᱣᱟᱭ)",
  },
  {
    id: "pen",
    category: "विद्यालय (School)",
    icon: "edit",
    color: "#6D4C41",
    hindi: "कलम / लेखनी",
    meaning: "Pen/Pencil — लिखने का साधन",
    dialects: {
      sat: {
        script: "ᱠᱚᱞᱚᱢ",
        translit: "Kolom",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱠᱚᱞᱚᱢ",
        translit: "Kolom",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "कलम",
        translit: "Kalam",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "कलम",
        translit: "Kalam",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "कलम",
        translit: "Kalam",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "अपनी कॉपी में कलम से लिखो। (ᱟᱢᱟᱜ ᱠᱷᱟᱛᱟ ᱨᱮ ᱠᱚᱞᱚᱢ ᱛᱮ ᱚᱞ ᱢᱮ)",
  },
  {
    id: "cow",
    category: "पशु-पक्षी (Animals)",
    icon: "pets",
    color: "#689F38",
    hindi: "गाय / गऊ",
    meaning: "Cow — दूध देने वाली माता",
    dialects: {
      sat: {
        script: "ᱜᱟᱹᱭ",
        translit: "Gai",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱜᱟᱹᱭ",
        translit: "Gai",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "गई",
        translit: "Gai",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "ओइ",
        translit: "Oi",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "गाय / गैया",
        translit: "Gaay",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "सफेद गाय हरी घास चरती है। (ᱯᱩᱸᱰ ᱜᱟᱹᱭ ᱦᱟᱹᱨᱭᱟᱹᱲ ᱜᱷᱟᱥ ᱡᱚᱢ ᱮᱫᱼᱟ)",
  },
  {
    id: "dog",
    category: "पशु-पक्षी (Animals)",
    icon: "sound_detection_dog_barking",
    color: "#D84315",
    hindi: "कुत्ता / श्वान",
    meaning: "Dog — वफादार साथी",
    dialects: {
      sat: {
        script: "ᱥᱮᱛᱟ",
        translit: "Seta",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱥᱮᱛᱟ",
        translit: "Seta",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "सेता",
        translit: "Seta",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "अल्ला",
        translit: "Alla",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "कुकुर",
        translit: "Kukur",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "कुत्ता घर की रखवाली करता है। (ᱥᱮᱛᱟ ᱚᱲᱟᱜ ᱮ ᱨᱩᱠᱷᱤᱭᱟᱹᱭᱟ)",
  },
  {
    id: "fish",
    category: "पशु-पक्षी (Animals)",
    icon: "phishing",
    color: "#0277BD",
    hindi: "मछली / मीन",
    meaning: "Fish — जल की रानी",
    dialects: {
      sat: {
        script: "ᱦᱟᱠᱳ",
        translit: "Hako",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱦᱟᱠᱩ",
        translit: "Haku",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "हाकु",
        translit: "Haaku",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "इंजो",
        translit: "Injo",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "माछ",
        translit: "Maachh",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "मछली तालाब में तैरती है। (ᱦᱟᱠᱳ ᱯᱩᱠᱷᱨᱤ ᱨᱮ ᱯᱟᱭᱨᱟᱜ ᱠᱟᱱᱟᱭ)",
  },
  {
    id: "farmer",
    category: "गाँव एवं समाज (Village & Community)",
    icon: "agriculture",
    color: "#2E7D32",
    hindi: "किसान / कृषक",
    meaning: "Farmer — अन्नदाता",
    dialects: {
      sat: {
        script: "ᱪᱟᱥᱤᱭᱟᱹ",
        translit: "Chasiya",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱪᱟᱥᱤ",
        translit: "Chasi",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "चासी",
        translit: "Chaasi",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "किसान",
        translit: "Kisan",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "किसान / हरवाहा",
        translit: "Kisan",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "किसान खेत में धान रोपता है। (ᱪᱟᱥᱤᱭᱟᱹ ᱠᱷᱮᱛ ᱨᱮ ᱦᱳᱲᱳᱭ ᱨᱚᱦᱚᱭ ᱮᱫᱼᱟ)",
  },
  {
    id: "market",
    category: "गाँव एवं समाज (Village & Community)",
    icon: "storefront",
    color: "#F57F17",
    hindi: "बाज़ार / हाट",
    meaning: "Weekly Market — गाँव का हाट",
    dialects: {
      sat: {
        script: "ᱦᱟᱴ / ᱵᱟᱡᱟᱨ",
        translit: "Haat / Bajar",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱦᱟᱴ",
        translit: "Haat",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "हाट",
        translit: "Haat",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "पेठिया",
        translit: "Pethiya",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "हाट / पेठिया",
        translit: "Haat / Pethiya",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "हम सब शनिवार को हाट जाते हैं। (ᱟᱞᱮ ᱥᱩᱱᱤᱵᱟᱨ ᱦᱟᱴ ᱞᱮ ᱥᱮᱱᱚᱜᱼᱟ)",
  },
  {
    id: "food",
    category: "गाँव एवं समाज (Village & Community)",
    icon: "restaurant",
    color: "#C62828",
    hindi: "भोजन / भात",
    meaning: "Food/Meal — गरमा-गरम भोजन",
    dialects: {
      sat: {
        script: "ᱫᱟᱠᱟ",
        translit: "Daka",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱢᱟᱱᱰᱤ",
        translit: "Mandi",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "मांडी",
        translit: "Maandi",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "मंडी",
        translit: "Mandi",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "भात / खैना",
        translit: "Bhaat",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "हाथ धोकर भोजन करो। (ᱛᱤ ᱟᱹᱨᱩᱵ ᱠᱟᱛᱮ ᱫᱟᱠᱟ ᱡᱚᱢ ᱢᱮ)",
  },
  {
    id: "one",
    category: "गिनती (Numbers)",
    icon: "looks_one",
    color: "#1565C0",
    hindi: "एक (१)",
    meaning: "One — संख्या एक",
    dialects: {
      sat: {
        script: "ᱢᱤᱫ (᱑)",
        translit: "Mid",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱢᱤ (᱑)",
        translit: "Mii",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "मियद (१)",
        translit: "Miyad",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "ओन्त (१)",
        translit: "Ont",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "एक (१)",
        translit: "Ek",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "आकाश में एक सूरज है। (ᱥᱮᱨᱢᱟ ᱨᱮ ᱢᱤᱫᱴᱟᱝ ᱪᱟᱸᱫᱚ ᱢᱮᱱᱟᱭᱟ)",
  },
  {
    id: "two",
    category: "गिनती (Numbers)",
    icon: "looks_two",
    color: "#6A1B9A",
    hindi: "दो (२)",
    meaning: "Two — संख्या दो",
    dialects: {
      sat: {
        script: "ᱵᱟᱨ (᱒)",
        translit: "Bar",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱵᱟᱨᱤᱭᱟ (᱒)",
        translit: "Bariya",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "बारिया (२)",
        translit: "Baariya",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "इरब (२)",
        translit: "Irb",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "दुई (२)",
        translit: "Dui",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "मेरे पास दो आँखें हैं। (ᱤᱧᱟᱜ ᱵᱟᱨᱭᱟ ᱢᱮᱫ ᱢᱮᱱᱟᱜᱼᱟ)",
  },
  {
    id: "three",
    category: "गिनती (Numbers)",
    icon: "looks_3",
    color: "#00838F",
    hindi: "तीन (३)",
    meaning: "Three — संख्या तीन",
    dialects: {
      sat: {
        script: "ᱯᱮ (᱓)",
        translit: "Pe",
        langName: "Santali (Ol Chiki)",
      },
      hoc: {
        script: "ᱟᱯᱤᱭᱟ (᱓)",
        translit: "Apiya",
        langName: "Ho (ᱦᱳ)",
      },
      unr: {
        script: "आपिया (३)",
        translit: "Aapiya",
        langName: "Mundari (मुंडारी)",
      },
      kru: {
        script: "मुंद (३)",
        translit: "Mund",
        langName: "Kurukh (कुड़ुख़)",
      },
      sck: {
        script: "तीन (३)",
        translit: "Teen",
        langName: "Sadri (नागपुरी)",
      },
    },
    sampleSentence: "तिरंगे में तीन रंग हैं। (ᱛᱤᱨᱟᱝᱜᱟ ᱨᱮ ᱯᱮᱭᱟ ᱨᱚᱝ ᱢᱮᱱᱟᱜᱼᱟ)",
  },
];

export default function Flashcards({ lessonText, currentGrade = 2 }) {
  const [selectedDialect, setSelectedDialect] = useState("sat");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [activeAudioBlob, setActiveAudioBlob] = useState(null);
  const [audioError, setAudioError] = useState("");

  // Categories extraction
  const categories = ["all", ...new Set(FOUNDATION_CARDS.map((c) => c.category))];
  const filteredCards = selectedCategory === "all"
    ? FOUNDATION_CARDS
    : FOUNDATION_CARDS.filter((c) => c.category === selectedCategory);

  const safeIndex = activeCardIndex >= filteredCards.length ? 0 : activeCardIndex;
  const card = filteredCards[safeIndex] || FOUNDATION_CARDS[0];
  const dialectInfo = card.dialects[selectedDialect] || card.dialects.sat;

  async function handlePlayCardAudio() {
    setAudioLoading(true);
    setAudioError("");
    setActiveAudioBlob(null);

    try {
      // If Santali, speak the Ol Chiki target script
      const textToSpeak = selectedDialect === "sat"
        ? dialectInfo.script
        : card.hindi; // Phrase bank checks Hindi source
      const res = await speak(textToSpeak, selectedDialect);
      if (res.kind === "audio") {
        setActiveAudioBlob(res.blob);
      } else if (res.kind === "phrase_bank_only") {
        setAudioError(res.reason || "Phrase bank audio unavailable for single word.");
      }
    } catch (err) {
      setAudioError("Audio error: " + err.message);
    } finally {
      setAudioLoading(false);
    }
  }

  function handleNext() {
    setIsFlipped(false);
    setActiveAudioBlob(null);
    setAudioError("");
    setActiveCardIndex((prev) => (prev + 1) % filteredCards.length);
  }

  function handlePrev() {
    setIsFlipped(false);
    setActiveAudioBlob(null);
    setAudioError("");
    setActiveCardIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  }

  return (
    <section className="flashcards-section" aria-labelledby="flashcards-heading">
      <div className="section-eyebrow">
        <span className="eyebrow-tag">कक्षा १–३ बाल-वाटिका</span>
        <span>दृश्य शिक्षण · सचित्र द्विभाषी शब्द-पत्ती (Visual Flashcards)</span>
      </div>
      <h1 id="flashcards-heading" className="screen-title">
        Visual Bilingual Flashcards <span lang="hi">(सचित्र शब्द-पत्ती)</span>
      </h1>
      <p className="screen-subtitle">
        Foundational Vocabulary in Authentic Mother-Tongue Scripts for Classroom Drills and Early Readers.
      </p>

      {/* Category & Dialect Selector Bars */}
      <div className="flashcards-toolbar">
        <div className="dialect-pills-bar" role="tablist" aria-label="Select Target Dialect">
          {[
            { code: "sat", name: "Santali (Ol Chiki ᱥᱟᱱᱛᱟᱲᱤ)" },
            { code: "hoc", name: "Ho (ᱦᱳ ᱡᱟᱜᱟᱨ)" },
            { code: "unr", name: "Mundari (मुंडारी)" },
            { code: "kru", name: "Kurukh (कुड़ुख़)" },
            { code: "sck", name: "Sadri (नागपुरी)" },
          ].map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="tab"
              aria-selected={selectedDialect === lang.code}
              className={`dialect-pill-btn ${selectedDialect === lang.code ? "active" : ""}`}
              onClick={() => {
                setSelectedDialect(lang.code);
                setActiveAudioBlob(null);
                setAudioError("");
              }}
            >
              {lang.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="button button--secondary tactile-btn-secondary"
          onClick={() => window.print()}
          title="Print flashcards for classroom circle drill"
        >
          <span className="material-symbols-outlined text-base">print</span>
          <span>Print Cards</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flashcards-category-bar" role="tablist" aria-label="Filter by Topic">
        {categories.map((cat) => {
          const label = cat === "all" ? "सभी विषय (All 24 Cards)" : cat;
          const count = cat === "all" ? FOUNDATION_CARDS.length : FOUNDATION_CARDS.filter((c) => c.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={selectedCategory === cat}
              className={`category-pill-btn ${selectedCategory === cat ? "active" : ""}`}
              onClick={() => {
                setSelectedCategory(cat);
                setActiveCardIndex(0);
                setIsFlipped(false);
                setActiveAudioBlob(null);
                setAudioError("");
              }}
            >
              <span>{label}</span>
              <span className="cat-count-badge">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Main Interactive Flashcard Display */}
      <div className="flashcard-stage-container">
        <div
          className={`interactive-flashcard-wrap ${isFlipped ? "flipped" : ""}`}
          onClick={() => setIsFlipped(!isFlipped)}
          role="button"
          tabIndex={0}
          aria-label={`Flashcard ${card.hindi}. Click to flip.`}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsFlipped(!isFlipped);
            }
          }}
        >
          <div className="flashcard-inner">
            {/* FRONT OF CARD (Hindi + Visual Icon) */}
            <div className="flashcard-face flashcard-front" style={{ borderColor: card.color }}>
              <div className="card-top-meta">
                <span className="card-cat-badge" style={{ backgroundColor: `${card.color}18`, color: card.color }}>
                  {card.category}
                </span>
                <span className="flip-hint">
                  <span className="material-symbols-outlined text-xs">sync</span>
                  <span>क्लिक करके पलटें (Click to Flip)</span>
                </span>
              </div>

              <div className="card-visual-circle" style={{ backgroundColor: `${card.color}15`, color: card.color }}>
                <span className="material-symbols-outlined card-big-icon" style={{ fontVariationSettings: "'FILL' 1" }}>
                  {card.icon}
                </span>
              </div>

              <div className="card-hindi-block">
                <h2 className="card-hindi-word" lang="hi">{card.hindi}</h2>
                <p className="card-meaning-sub">{card.meaning}</p>
              </div>

              <div className="card-bottom-footer">
                <span className="card-class-tag">Class {currentGrade} Vocabulary</span>
                <span className="card-index-count">
                  {safeIndex + 1} / {filteredCards.length}
                </span>
              </div>
            </div>

            {/* BACK OF CARD (Mother-Tongue Native Script + Audio) */}
            <div className="flashcard-face flashcard-back" style={{ borderColor: card.color }}>
              <div className="card-top-meta">
                <span className="card-cat-badge" style={{ backgroundColor: `${card.color}18`, color: card.color }}>
                  {dialectInfo.langName}
                </span>
                <span className="flip-hint">
                  <span className="material-symbols-outlined text-xs">sync</span>
                  <span>वापस पलटें (Flip Back)</span>
                </span>
              </div>

              <div className="card-mother-tongue-block">
                <span className="script-badge-small">मूल लिपि (Native Script):</span>
                <div className="card-native-script" lang={selectedDialect}>
                  {dialectInfo.script}
                </div>
                <div className="card-translit-pronounce">
                  <span>उच्चारण (Phonetics): </span>
                  <strong>{dialectInfo.translit}</strong>
                </div>
              </div>

              <div className="card-sentence-box" lang="hi">
                <span className="sentence-label">कक्षा प्रयोग (Classroom Usage):</span>
                <p className="sentence-text">{card.sampleSentence}</p>
              </div>

              <div className="card-action-bar" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="button button--primary tactile-btn-primary card-audio-btn"
                  onClick={handlePlayCardAudio}
                  disabled={audioLoading}
                >
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    volume_up
                  </span>
                  <span>{audioLoading ? "Generating Speech…" : "बोलकर सुनाएं (Listen Pronunciation)"}</span>
                </button>
              </div>

              {activeAudioBlob && (
                <div className="card-player-embed" onClick={(e) => e.stopPropagation()}>
                  <AudioPlayer blob={activeAudioBlob} label={`${card.hindi} pronunciation`} />
                </div>
              )}

              {audioError && <p className="error text-xs" style={{ margin: "0.25rem 0" }}>{audioError}</p>}
            </div>
          </div>
        </div>

        {/* Carousel Navigation Controls */}
        <div className="flashcard-nav-controls">
          <button
            type="button"
            className="button button--secondary tactile-btn-secondary"
            onClick={handlePrev}
            aria-label="Previous card"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            <span>Previous Card</span>
          </button>

          <span className="card-counter-display">
            Card <strong>{safeIndex + 1}</strong> of {filteredCards.length}
          </span>

          <button
            type="button"
            className="button button--primary tactile-btn-primary"
            onClick={handleNext}
            aria-label="Next card"
          >
            <span>Next Card</span>
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
      </div>

      {/* Classroom Drill Guide */}
      <div className="flashcard-pedagogy-guide sun-card-shadow">
        <div className="guide-header">
          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            tips_and_updates
          </span>
          <strong>शिक्षक बाल-सखा मार्गदर्शन (Teacher's Circle Drill Routine)</strong>
        </div>
        <ol className="drill-steps-list">
          <li>
            <strong>देखें और पहचानें (Step 1):</strong> कार्ड का अगला भाग दिखाकर बच्चों से हिंदी शब्द और चित्र पहचानने को कहें।
          </li>
          <li>
            <strong>बोली में अनुवाद (Step 2):</strong> कार्ड पलटकर Ol Chiki या स्थानीय लिपि में लिखा शब्द दिखाएं।
          </li>
          <li>
            <strong>ऑडियो उच्चारण (Step 3):</strong> "बोलकर सुनाएं" बटन दबाएं और बच्चों को तीन बार एक साथ दोहराने को कहें (Classroom Chanting)।
          </li>
        </ol>
      </div>
    </section>
  );
}
