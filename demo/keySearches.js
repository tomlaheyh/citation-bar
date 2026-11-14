// keySearches.js - Prebuilt PubMed searches for the kS menu on the citation bar.
// Each query is the topic only. When a search is run, the bar adds
// 'AND hasabstract' and the Xout exclusions except reviews, systematic
// reviews and meta-analyses, so those are not repeated here.
// Group and search names stay in English: they name search terms.
export const KEY_SEARCHES = {
  "groups": [
    {
      "name": "Metabolic",
      "searches": [
        {
          "label": "GLP-1 drugs",
          "query": "\"Glucagon-Like Peptide-1 Receptor Agonists\"[majr] OR semaglutide[ti] OR tirzepatide[ti] OR liraglutide[ti] OR dulaglutide[ti] OR \"GLP-1 receptor agonist\"[ti] OR \"GLP-1 receptor agonists\"[ti] OR \"GLP-1 RA\"[ti] OR \"GLP-1RA\"[ti] OR \"GLP-1RAs\"[ti] OR incretin[ti]"
        },
        {
          "label": "MASLD / fatty liver",
          "query": "\"Non-alcoholic Fatty Liver Disease\"[majr] OR MASLD[ti] OR NAFLD[ti] OR MASH[ti] OR NASH[ti] OR \"fatty liver\"[ti] OR \"steatotic liver\"[ti] OR steatohepatitis[ti]"
        },
        {
          "label": "Obesity",
          "query": "Obesity[majr] OR obesity[ti] OR obese[ti]"
        }
      ]
    },
    {
      "name": "Cardio",
      "searches": [
        {
          "label": "Heart failure",
          "query": "\"Heart Failure\"[majr] OR \"heart failure\"[ti] OR HFpEF[ti] OR HFrEF[ti]"
        },
        {
          "label": "Hypertension",
          "query": "(Hypertension[majr] OR hypertension[ti] OR \"blood pressure\"[ti]) NOT (\"Hypertension, Pulmonary\"[majr] OR \"Hypertension, Portal\"[majr] OR \"Intracranial Hypertension\"[majr] OR \"pulmonary hypertension\"[ti] OR \"portal hypertension\"[ti] OR \"intracranial hypertension\"[ti] OR \"ocular hypertension\"[ti])"
        },
        {
          "label": "Lp(a)",
          "query": "\"Lipoprotein(a)\"[majr] OR \"lipoprotein(a)\"[ti] OR \"Lp(a)\"[ti]"
        }
      ]
    },
    {
      "name": "Brain",
      "searches": [
        {
          "label": "Alzheimer's / dementia",
          "query": "\"Alzheimer Disease\"[majr] OR Dementia[majr] OR alzheimer[ti] OR \"alzheimer's\"[ti] OR dementia[ti]"
        },
        {
          "label": "MCI (pre-dementia)",
          "query": "(\"Cognitive Dysfunction\"[majr] OR \"mild cognitive impairment\"[ti] OR \"cognitive decline\"[ti] OR \"subjective cognitive decline\"[ti]) NOT (\"Alzheimer Disease\"[majr] OR Dementia[majr] OR alzheimer[ti] OR \"alzheimer's\"[ti] OR dementia[ti])"
        },
        {
          "label": "Depression & anxiety",
          "query": "Depression[majr] OR \"Depressive Disorder\"[majr] OR Anxiety[majr] OR \"Anxiety Disorders\"[majr] OR depression[ti] OR depressive[ti] OR anxiety[ti]"
        }
      ]
    },
    {
      "name": "Cancer",
      "searches": [
        {
          "label": "Immunotherapy",
          "query": "\"Immune Checkpoint Inhibitors\"[majr] OR \"Receptors, Chimeric Antigen\"[majr] OR \"immune checkpoint\"[ti] OR \"CAR-T\"[ti] OR \"CAR T\"[ti] OR pembrolizumab[ti] OR nivolumab[ti] OR atezolizumab[ti] OR durvalumab[ti] OR \"PD-1\"[ti] OR \"PD-L1\"[ti]"
        },
        {
          "label": "Liquid biopsy / ctDNA",
          "query": "\"Liquid Biopsy\"[majr] OR \"Circulating Tumor DNA\"[majr] OR \"liquid biopsy\"[ti] OR \"circulating tumor DNA\"[ti] OR ctDNA[ti] OR \"cell-free DNA\"[ti]"
        },
        {
          "label": "Early-onset cancer",
          "query": "(\"early-onset\"[ti] OR \"young-onset\"[ti]) AND (cancer[ti] OR cancers[ti] OR carcinoma[ti] OR neoplasms[ti])"
        }
      ]
    },
    {
      "name": "AI",
      "searches": [
        {
          "label": "LLMs / generative AI",
          "query": "\"large language model\"[tiab] OR \"large language models\"[tiab] OR ChatGPT[tiab] OR \"GPT-4\"[tiab] OR \"GPT-4o\"[tiab] OR \"generative AI\"[tiab] OR \"generative artificial intelligence\"[tiab]"
        },
        {
          "label": "AI imaging & diagnosis",
          "query": "(\"Artificial Intelligence\"[majr] OR \"Deep Learning\"[majr] OR \"artificial intelligence\"[ti] OR \"deep learning\"[ti] OR \"machine learning\"[ti]) AND (\"Diagnostic Imaging\"[mh] OR imaging[ti] OR radiology[ti] OR diagnosis[ti] OR diagnostic[ti] OR detection[ti])"
        },
        {
          "label": "AI in medical education",
          "query": "(\"Artificial Intelligence\"[majr] OR \"artificial intelligence\"[ti] OR \"large language model\"[ti] OR \"large language models\"[ti] OR ChatGPT[ti] OR \"generative AI\"[ti]) AND (\"Education, Medical\"[majr] OR \"medical education\"[tiab] OR \"medical students\"[tiab] OR \"medical student\"[tiab] OR residency[tiab] OR \"licensing examination\"[tiab])"
        }
      ]
    },
    {
      "name": "Longevity",
      "searches": [
        {
          "label": "Aging biology",
          "query": "\"Cellular Senescence\"[majr] OR \"Senotherapeutics\"[majr] OR \"cellular senescence\"[ti] OR senolytic[ti] OR senolytics[ti] OR \"biological age\"[ti] OR \"epigenetic clock\"[ti] OR \"epigenetic clocks\"[ti] OR healthspan[ti] OR \"hallmarks of aging\"[ti]"
        },
        {
          "label": "Gut microbiome",
          "query": "\"Gastrointestinal Microbiome\"[majr] OR \"gut microbiome\"[ti] OR \"gut microbiota\"[ti] OR \"intestinal microbiota\"[ti] OR \"gut-brain axis\"[ti]"
        },
        {
          "label": "Diet patterns",
          "query": "\"Diet, Mediterranean\"[majr] OR \"Intermittent Fasting\"[majr] OR \"Mediterranean diet\"[ti] OR \"intermittent fasting\"[ti] OR \"time-restricted eating\"[ti] OR \"plant-based diet\"[ti] OR \"ultra-processed\"[ti] OR \"ketogenic diet\"[ti]"
        }
      ]
    },
    {
      "name": "Supplements",
      "searches": [
        {
          "label": "Vitamin D",
          "query": "(\"Vitamin D\"[majr] OR \"vitamin D\"[ti] OR cholecalciferol[ti]) AND (\"Dietary Supplements\"[mh] OR supplementation[tiab] OR supplement[tiab] OR supplements[tiab] OR supplemented[tiab])"
        },
        {
          "label": "Probiotics",
          "query": "Probiotics[majr] OR probiotic[ti] OR probiotics[ti]"
        },
        {
          "label": "NAD+ precursors",
          "query": "\"nicotinamide mononucleotide\"[tiab] OR \"nicotinamide riboside\"[tiab] OR \"NAD+ precursor\"[tiab] OR \"NAD+ precursors\"[tiab] OR (NMN[tiab] AND NAD[tiab])"
        }
      ]
    }
  ]
};
