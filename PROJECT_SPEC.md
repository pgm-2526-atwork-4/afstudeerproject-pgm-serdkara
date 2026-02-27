# Project Specificatie: LLM-as-a-Judge Validatie Framework

## 1. Context & Probleemstelling
Dit project ontwikkelt een framework om de output van Large Language Models (LLMs) binnen een cybersecurity-context te valideren.
* [cite_start]**Domein:** Interpretatie van cybersecurity policies (o.a. ISO 27001, NIST, interne policies)[cite: 2].
* [cite_start]**Probleem:** LLM-output kan foutief, hallucinerend of inconsistent zijn, wat in security een hoog risico vormt (compliance, audit)[cite: 4, 5].
* [cite_start]**Kernoplossing:** Implementatie van een **"LLM-as-a-Judge"** mechanisme om interpretaties automatisch te scoren en te valideren[cite: 7, 12].

## 2. Hoofddoelstellingen (Objectives)
De Antigravity LLM moet bij ontwikkeling prioriteit geven aan de volgende doelen:
1.  [cite_start]**Validatie-Accuraatheid:** Het systeem moet vaststellen of automatische validatie accuraat genoeg is voor professioneel gebruik[cite: 8].
2.  [cite_start]**Vergelijkbaarheid:** Het systeem moet een objectieve vergelijking mogelijk maken tussen automatische scores en menselijke expertise (Ground Truth)[cite: 32, 33].
3.  [cite_start]**Schaalbaarheid:** De oplossing moet validatie mogelijk maken zonder constante menselijke tussenkomst[cite: 52].

## 3. Functionele Requirements

### 3.1 Input Verwerking
* [cite_start]Het systeem moet diverse cybersecurity policies (PDF/Text) kunnen inlezen als bronmateriaal[cite: 26].
* Het systeem moet ruwe policy-tekst segmenteren voor verwerking.

### 3.2 Generatie (Primary LLM)
* [cite_start]Een primaire LLM leest de policy en vertaalt deze naar actiegerichte output[cite: 2, 28].
* **Constraint:** De output moet traceerbaar zijn naar de brontekst.

### 3.3 Evaluatie (The Judge)
* [cite_start]Implementeer een LLM-as-a-Judge module die de output van de primaire LLM beoordeelt[cite: 12].
* [cite_start]De Judge moet configureerbaar zijn om verschillende prompts en beoordelingsrubrics te testen[cite: 37].
* [cite_start]**Output Formaat:** De Judge moet een score, classificatie of expliciet verdict (bv. Correct/Incorrect) leveren[cite: 13].

### 3.4 Validatie Criteria (Rubrics)
[cite_start]De code moet logica bevatten om specifiek op de volgende dimensies te toetsen [cite: 15-23]:
* [cite_start]**Correctheid:** Komt de interpretatie feitelijk overeen met de originele policytekst? [cite: 19]
* [cite_start]**Volledigheid:** Zijn er geen essentiële controls of verplichtingen gemist? [cite: 20]
* [cite_start]**Consistentie:** Bevat de output geen interne contradicties? [cite: 21]
* [cite_start]**Security-relevantie:** Ligt de focus op risicovolle elementen? [cite: 22]
* [cite_start]**Traceerbaarheid:** Is er een link tussen de output en het specifieke policyfragment? [cite: 23]

## 4. Experimentele Architectuur
De applicatie moet de volgende experimentele opstellingen ondersteunen om de onderzoeksvragen te beantwoorden:
1.  [cite_start]**Self-Judging:** De primaire LLM beoordeelt zijn eigen output[cite: 39].
2.  [cite_start]**Cross-Model Judging:** Een ander model (mogelijk sterker/anders) beoordeelt de primaire LLM[cite: 40].
3.  [cite_start]**Benchmarking:** Functionaliteit om de LLM-score te vergelijken met een menselijke "Gold Standard" score om de *agreement* te berekenen[cite: 32, 41].

## 5. Constraints & Risico-mitigatie
Bij het genereren van code moet rekening gehouden worden met de volgende beperkingen:
* [cite_start]**Bias & Consistentie:** Implementeer mechanismen (zoals multiple-shot of temperature settings) om self-consistency problemen te minimaliseren[cite: 43].
* [cite_start]**Geen Formele Verificatie:** De UI/UX en documentatie moeten duidelijk maken dat dit een probabilistische validatie is en geen formele garantie[cite: 47].
* [cite_start]**Overconfidence:** Het systeem moet (indien mogelijk via log-probs of confidence scores) detecteren wanneer een Judge "overconfident" is over een foute interpretatie[cite: 46].

## 6. Verwachte Output van het Systeem
Het eindproduct moet data genereren die leidt tot:
* [cite_start]Een objectieve evaluatie van de LLM-as-a-Judge performance[cite: 55].
* [cite_start]Concrete aanbevelingen voor productiegebruik (welk model, welke prompt, welke temperatuur)[cite: 56].
* [cite_start]Richtlijnen voor veilige inzet (Safety Guidelines)[cite: 58].

---
*Gebaseerd op brondocument: Evaluatie-studie.pdf*