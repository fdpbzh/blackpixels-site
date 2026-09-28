// Onglet Planning de la page admin Black Pixels.
// Lit et écrit la table Supabase « prestations » (même connexion et mêmes droits que les contrats).
(function () {
  const MOIS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const MOIS_C = ["janv","févr","mars","avr","mai","juin","juil","août","sept","oct","nov","déc"];
  const JOURS = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"];
  const JOURS_C = ["dim","lun","mar","mer","jeu","ven","sam"];
  const STATUTS = { signe:"Signé", reserve:"Réservé", envoye:"Contrat envoyé", a_confirmer:"À confirmer", discussion:"Demande en cours", annule:"Annulé" };
  const TYPES = { mariage:"Mariage", seance:"Séance", evenement:"Événement" };
  const EN_ATTENTE = ["envoye","a_confirmer","discussion"];
  const CONFIRMES = ["signe","reserve"];
  const CHAMPS = ["date","titre","type","statut","lieu","formule","prestation","prix","note","lien_mail","lien_mail_label"];

  let sb = null, lignes = [], contrats = {}, pret = false, erreur = null;
  let vue = lire("bp.planning.vue", "avenir");
  let montants = lire("bp.planning.montants", "1") === "1";
  let ouvert = null, brouillon = null, confirmSuppr = false, msg = null;

  function lire(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function garder(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  function h(tag, attrs, ...enfants) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k]; if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const e of enfants.flat()) { if (e == null || e === false) continue; el.append(e instanceof Node ? e : document.createTextNode(String(e))); }
    return el;
  }
  const $ = id => document.getElementById(id);
  function pd(s) { if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null; const [y, m, d] = s.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d); }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function auj() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function ecart(a, b) { return Math.round((b - a) / 86400000); }
  function jnum(d) { return d.getDate() === 1 ? "1er" : String(d.getDate()); }
  function dateLongue(d) { return JOURS[d.getDay()] + " " + jnum(d) + " " + MOIS[d.getMonth()] + " " + d.getFullYear(); }
  function dateCourte(d) { return JOURS_C[d.getDay()] + ". " + jnum(d) + " " + MOIS[d.getMonth()]; }
  const nf = new Intl.NumberFormat("fr-FR");
  function euros(n) { return nf.format(n) + " €"; }
  function num(v) { if (v === null || v === undefined || v === "") return null; const n = Number(v); return isNaN(n) ? null : n; }
  function horsSamedi(p) { const d = pd(p.date); return p.type === "mariage" && p.statut !== "annule" && d && d.getDay() !== 6; }
  function versIso(s) { const m = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(s || ""); if (!m) return null; return m[3] + "-" + m[2].padStart(2, "0") + "-" + m[1].padStart(2, "0"); }

  // ---------- données ----------
  async function charger() {
    if (!sb) return;
    const [p, c] = await Promise.all([
      sb.from("prestations").select("*").order("date", { ascending: true }),
      sb.from("contracts").select("id,status,signed_at,token,titre,created_at")
    ]);
    if (p.error) { erreur = p.error.message; pret = true; rendre(); return; }
    erreur = null;
    lignes = p.data || [];
    contrats = Object.fromEntries((c.data || []).map(x => [x.id, x]));
    pret = true;
    rendre();
  }

  function visibles() {
    const t = auj();
    return lignes.filter(p => {
      const d = pd(p.date); if (!d) return false;
      if (vue === "avenir") return d >= t;
      if (vue === "tout") return true;
      return String(d.getFullYear()) === vue;
    }).sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : String(a.titre).localeCompare(String(b.titre), "fr"));
  }

  function enchainements() {
    const tout = lignes.filter(p => pd(p.date) && p.statut !== "annule").sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
    const out = {};
    const ajout = (id, t) => (out[id] = out[id] || []).push({ t, c: "" });
    for (let i = 1; i < tout.length; i++) {
      const a = tout[i - 1], b = tout[i], g = ecart(pd(a.date), pd(b.date));
      if (g === 0) { ajout(b.id, "Même jour que " + a.titre); ajout(a.id, "Même jour que " + b.titre); }
      else if (g <= 2) ajout(b.id, (g === 1 ? "Le lendemain de " : "2 jours après ") + a.titre);
    }
    return out;
  }

  // ---------- squelette ----------
  function construire() {
    const r = $("vue-planning");
    r.className = "pl" + (montants ? "" : " sans-montants");
    r.replaceChildren(
      h("div", { class: "pl-haut" }, h("h2", { id: "pl-titre" }, "À venir"), h("div", { class: "pl-vues", id: "pl-vues", role: "group", "aria-label": "Période affichée" })),
      h("div", { class: "pl-resume", id: "pl-resume" }),
      h("div", { class: "pl-prochain", id: "pl-prochain" }),
      h("div", { class: "pl-planche", id: "pl-planche" }, h("div", { class: "pl-mois-bande", id: "pl-bande" })),
      h("div", { class: "pl-barre" },
        h("div", { class: "pl-legende" },
          h("span", null, h("i", { class: "hs" }), "Mariage hors samedi"),
          h("span", null, h("i", { class: "att" }), "Pas encore confirmé"),
          h("span", null, h("i", { class: "ev" }), "Séance ou événement")),
        h("div", { class: "actions" },
          h("button", { type: "button", class: "btn mini", id: "pl-montants", onclick: () => { montants = !montants; garder("bp.planning.montants", montants ? "1" : "0"); rendre(); } }, "Masquer les montants"),
          h("button", { type: "button", class: "btn mini vert", id: "pl-ajouter", onclick: () => { ouvert = "__nouveau"; brouillon = null; msg = null; confirmSuppr = false; rendre(); const f = $("pln-titre"); if (f) f.focus(); } }, "Ajouter une date"))),
      h("div", { id: "pl-nouveau" }),
      h("div", { id: "pl-mois" }, h("div", { class: "pl-etat" }, h("strong", null, "Chargement du planning"), "Tes mariages, séances et événements apparaissent ici, mois par mois."))
    );
  }

  // ---------- rendu ----------
  function rendre() {
    const r = $("vue-planning"); if (!r || !$("pl-mois")) return;
    r.classList.toggle("sans-montants", !montants);
    $("pl-montants").textContent = montants ? "Masquer les montants" : "Afficher les montants";
    const liste = visibles();
    rendreVues(); rendreResume(liste); rendrePlanche(liste); rendreNouveau(); rendreMois(liste);
  }

  function rendreVues() {
    const annees = [...new Set(lignes.map(p => p.date.slice(0, 4)))].sort();
    const opts = [["avenir", "À venir"], ...annees.map(a => [a, a]), ["tout", "Tout"]];
    if (!opts.some(o => o[0] === vue)) vue = "avenir";
    $("pl-vues").replaceChildren(...opts.map(([v, l]) => h("button", { type: "button", "aria-pressed": String(vue === v), onclick: () => { vue = v; garder("bp.planning.vue", v); ouvert = null; brouillon = null; rendre(); } }, l)));
    $("pl-titre").textContent = vue === "avenir" ? "À venir" : vue === "tout" ? "Toutes les dates" : "Saison " + vue;
  }

  function rendreResume(liste) {
    const res = $("pl-resume"), pro = $("pl-prochain"); res.replaceChildren(); pro.replaceChildren();
    if (!pret || erreur) return;
    const mariages = liste.filter(p => p.type === "mariage");
    const conf = mariages.filter(p => CONFIRMES.includes(p.statut));
    const att = liste.filter(p => EN_ATTENTE.includes(p.statut));
    const hs = mariages.filter(p => horsSamedi(p) && p.statut !== "discussion");
    const ca = liste.filter(p => CONFIRMES.includes(p.statut) && num(p.prix) != null).reduce((s, p) => s + num(p.prix), 0);
    const caAtt = liste.filter(p => EN_ATTENTE.includes(p.statut) && num(p.prix) != null).reduce((s, p) => s + num(p.prix), 0);
    res.append(
      h("span", null, h("b", null, String(conf.length)), " " + (conf.length > 1 ? "mariages confirmés" : "mariage confirmé")),
      h("span", null, h("b", null, String(att.length)), " en attente"),
      h("span", { class: hs.length ? "alerte" : "" }, h("b", null, String(hs.length)), " hors samedi"),
      h("span", { class: "montant" }, h("b", null, euros(ca)), " confirmés" + (caAtt ? " · " + euros(caAtt) + " en attente" : "")));
    const t = auj();
    const prochain = lignes.filter(p => p.type === "mariage" && CONFIRMES.includes(p.statut) && pd(p.date) >= t).sort((a, b) => a.date < b.date ? -1 : 1)[0];
    if (prochain) { const d = pd(prochain.date), n = ecart(t, d); pro.append("Prochain mariage : ", h("strong", null, prochain.titre), " · " + dateLongue(d) + " · " + (n === 0 ? "aujourd'hui" : n === 1 ? "demain" : "dans " + n + " jours")); }
  }

  function rendrePlanche(liste) {
    const bloc = $("pl-planche"), bande = $("pl-bande"); bande.replaceChildren();
    if (!pret || erreur || vue === "tout") { bloc.hidden = true; return; }
    bloc.hidden = false;
    const t = auj();
    const debut = vue === "avenir" ? new Date(t.getFullYear(), t.getMonth(), 1) : new Date(Number(vue), 0, 1);
    for (let i = 0; i < 12; i++) {
      const m = new Date(debut.getFullYear(), debut.getMonth() + i, 1), k = iso(m).slice(0, 7);
      const dansM = liste.filter(p => p.date.slice(0, 7) === k && p.statut !== "annule");
      const nM = dansM.filter(p => p.type === "mariage").length;
      const images = h("div", { class: "pl-images" }, dansM.map(p => {
        let c = "pl-img";
        if (p.type !== "mariage") c += " ev"; else { if (horsSamedi(p)) c += " hs"; if (EN_ATTENTE.includes(p.statut)) c += " att"; }
        if (pd(p.date) < t) c += " passe";
        return h("i", { class: c, title: dateCourte(pd(p.date)) + " · " + p.titre });
      }));
      bande.append(h("button", { type: "button", class: "pl-cell", disabled: dansM.length ? null : true, "aria-label": MOIS[m.getMonth()] + " " + m.getFullYear() + " : " + dansM.length + " date(s)",
        onclick: () => { const el = $("plm-" + k); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); } },
        h("span", { class: "n" }, nM ? String(nM) : "·"), images,
        h("span", { class: "m" }, MOIS_C[m.getMonth()], (vue === "avenir" && (i === 0 || m.getMonth() === 0)) ? h("small", null, String(m.getFullYear())) : null)));
    }
  }

  function drapeaux(p, ench) {
    const out = [...(ench[p.id] || [])];
    if (p.statut === "envoye" && p.envoye_le) { const n = ecart(pd(p.envoye_le), auj()); if (n >= 7) out.push({ t: "Contrat envoyé il y a " + n + " jours, pas encore signé", c: "att" }); }
    return out;
  }

  function ligne(p, ench) {
    const d = pd(p.date), t = auj(), passe = d < t, n = ecart(t, d);
    const st = p.type === "evenement" ? { l: "Événement", c: "st-evenement" } : { l: STATUTS[p.statut] || p.statut, c: "st-" + p.statut };
    const meta = [p.lieu, p.formule, p.type === "mariage" ? p.prestation : null].filter(Boolean);
    const fl = drapeaux(p, ench);
    const li = h("li", { class: "pl-ligne k-" + (p.type || "mariage") + (passe ? " passe" : "") + (horsSamedi(p) ? " hs" : "") });
    li.append(h("button", { type: "button", class: "pl-l", "aria-expanded": String(ouvert === p.id), onclick: () => basculer(p) },
      h("div", { class: "pl-date" }, h("span", { class: "d" }, jnum(d)), h("span", { class: "j" }, JOURS_C[d.getDay()])),
      h("div", { class: "pl-corps" },
        h("div", { class: "pl-titre" }, h("span", null, p.titre || "Sans nom"), p.type && p.type !== "mariage" ? h("span", { class: "pl-type" }, TYPES[p.type] || p.type) : null),
        meta.length ? h("div", { class: "pl-meta" }, meta.join(" · ")) : null,
        p.note ? h("div", { class: "pl-note" }, p.note) : null,
        fl.length ? h("div", { class: "pl-flags" }, fl.map(f => h("span", { class: "pl-flag " + f.c }, f.t))) : null),
      h("div", { class: "pl-cote" },
        h("span", { class: "pl-statut " + st.c }, st.l),
        num(p.prix) != null ? h("span", { class: "pl-prix" }, euros(num(p.prix))) : null,
        h("span", { class: "pl-j" }, passe ? "passé" : n === 0 ? "aujourd'hui" : "J-" + n))));
    if (ouvert === p.id) li.append(fiche(p, false));
    return li;
  }

  function basculer(p) {
    if (ouvert === p.id) { ouvert = null; brouillon = null; } else { ouvert = p.id; brouillon = Object.assign({}, p); }
    confirmSuppr = false; msg = null; rendre();
  }

  function fiche(p, nouveau) {
    if (!brouillon || brouillon.id !== p.id) brouillon = Object.assign({}, p);
    const B = brouillon, pre = nouveau ? "pln-" : "ple-";
    const f = h("form", { class: "pl-fiche", onsubmit: e => { e.preventDefault(); enregistrer(nouveau); } });
    const d = pd(B.date), faits = [];
    if (d) faits.push(h("span", null, h("b", null, dateLongue(d))));
    if (d && B.type === "mariage" && B.statut !== "annule") { const l = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 14); faits.push(h("span", null, "Livraison des photos au plus tard le ", h("b", null, dateCourte(l)))); }
    const c = B.contract_id ? contrats[B.contract_id] : null;
    if (c) faits.push(h("span", null, "Contrat en ligne : ", h("b", null, c.status === "signe" ? "signé le " + new Date(c.signed_at).toLocaleDateString("fr-FR") : "envoyé le " + new Date(c.created_at).toLocaleDateString("fr-FR"))));
    if (faits.length) f.append(h("div", { class: "pl-faits" }, faits));
    const liens = [];
    if (c && c.status === "signe" && typeof genererPdfContrat === "function") liens.push(h("button", { type: "button", class: "btn mini vert", onclick: () => pdfContrat(c.id) }, "PDF du contrat"));
    if (c && c.status !== "signe" && typeof lienPour === "function") liens.push(h("button", { type: "button", class: "btn mini", onclick: e => { navigator.clipboard.writeText(lienPour(c)).then(() => { e.target.textContent = "Lien copié"; }, () => {}); } }, "Copier le lien du contrat"));
    if (B.drive_id) liens.push(h("a", { href: "https://drive.google.com/drive/folders/" + encodeURIComponent(B.drive_id), target: "_blank", rel: "noopener" }, "Dossier Drive"));
    if (B.lien_mail) liens.push(h("a", { href: B.lien_mail, target: "_blank", rel: "noopener" }, B.lien_mail_label || "Voir le mail"));
    if (liens.length) f.append(h("div", { class: "pl-liens" }, liens));

    function champ(cle, libelle, type, extra) {
      const id = pre + cle;
      const el = h("input", Object.assign({ id, type: type || "text", oninput: e => { B[cle] = e.target.value; } }, extra || {}));
      el.value = B[cle] == null ? "" : String(B[cle]);
      return h("div", null, h("label", { for: id }, libelle), el);
    }
    function choix(cle, libelle, opts) {
      const id = pre + cle;
      const s = h("select", { id, onchange: e => { B[cle] = e.target.value; } }, opts.map(([v, l]) => h("option", { value: v }, l)));
      s.value = B[cle] == null ? opts[0][0] : B[cle];
      return h("div", null, h("label", { for: id }, libelle), s);
    }
    const note = h("textarea", { id: pre + "note", oninput: e => { B.note = e.target.value; } }); note.value = B.note || "";
    f.append(
      h("div", { class: "grille2" }, champ("titre", "Nom *", null, { required: true }), champ("date", "Date *", "date", { required: true })),
      h("div", { class: "grille2" }, choix("type", "Type", Object.entries(TYPES)), choix("statut", "Statut", Object.entries(STATUTS))),
      h("div", { class: "grille2" }, champ("lieu", "Lieu"), champ("formule", "Formule")),
      h("div", { class: "grille2" }, choix("prestation", "Prestation", [["", "—"], ["photo", "Photo"], ["vidéo", "Vidéo"], ["photo & vidéo", "Photo & Vidéo"]]), champ("prix", "Prix (€)", "number", { min: "0", step: "10" })),
      h("div", null, h("label", { for: pre + "note" }, "Note"), note));
    const act = h("div", { class: "pl-fiche-actions" },
      h("button", { type: "submit", class: "btn mini" }, nouveau ? "Ajouter au planning" : "Enregistrer"),
      h("button", { type: "button", class: "btn mini", style: "background:transparent;color:var(--dark)", onclick: () => { ouvert = null; brouillon = null; msg = null; confirmSuppr = false; rendre(); } }, "Fermer"));
    if (!nouveau) {
      if (!confirmSuppr) act.append(h("button", { type: "button", class: "btn mini rouge", onclick: () => { confirmSuppr = true; rendre(); } }, "Retirer du planning"));
      else act.append(h("span", { class: "pl-msg err" }, "Retirer cette date ? Elle ne reviendra pas avec la synchro du matin."),
        h("button", { type: "button", class: "btn mini rouge", onclick: supprimer }, "Oui, retirer"),
        h("button", { type: "button", class: "btn mini", style: "background:transparent;color:var(--dark)", onclick: () => { confirmSuppr = false; rendre(); } }, "Non"));
    }
    if (msg) act.append(h("span", { class: "pl-msg" + (msg.err ? " err" : "") }, msg.t));
    f.append(act);
    return f;
  }

  async function pdfContrat(id) {
    const { data, error } = await sb.from("contracts").select("*").eq("id", id).single();
    if (error || !data) { msg = { t: "Impossible de charger le contrat.", err: true }; rendre(); return; }
    telechargerPdf(await genererPdfContrat(data), nomFichierContrat(data));
  }

  async function enregistrer(nouveau) {
    const B = brouillon; if (!B) return;
    if (!B.titre || !String(B.titre).trim()) { msg = { t: "Donne un nom à cette date.", err: true }; rendre(); return; }
    if (!pd(B.date)) { msg = { t: "Choisis une date valide.", err: true }; rendre(); return; }
    const corps = {};
    for (const k of CHAMPS) { const v = B[k]; corps[k] = (v === "" || v === undefined) ? null : v; }
    corps.titre = String(B.titre).trim();
    corps.type = B.type || "mariage"; corps.statut = B.statut || "reserve";
    corps.prix = num(B.prix);
    msg = { t: "Enregistrement…" }; rendre();
    const r = nouveau
      ? await sb.from("prestations").insert(Object.assign(corps, { source: "manuel" })).select().single()
      : await sb.from("prestations").update(corps).eq("id", B.id).select().single();
    if (r.error) { msg = { t: "Enregistrement impossible : " + r.error.message, err: true }; rendre(); return; }
    if (nouveau) { ouvert = null; brouillon = null; msg = null; }
    else { brouillon = Object.assign({}, r.data); msg = { t: "Enregistré" }; }
    await charger();
    if (nouveau) { const el = $("plm-" + r.data.date.slice(0, 7)); if (el) el.scrollIntoView({ block: "start" }); }
  }

  async function supprimer() {
    const p = lignes.find(x => x.id === ouvert); if (!p) return;
    const garderDrive = p.drive_id && !lignes.some(x => x.id !== p.id && x.drive_id === p.drive_id);
    if (p.contract_id || garderDrive) {
      const e = await sb.from("prestations_ecartees").insert({ contract_id: p.contract_id || null, drive_id: garderDrive ? p.drive_id : null, titre: p.titre });
      if (e.error) { msg = { t: "Impossible de retirer cette date : " + e.error.message, err: true }; confirmSuppr = false; rendre(); return; }
    }
    const r = await sb.from("prestations").delete().eq("id", p.id);
    if (r.error) { msg = { t: "Impossible de retirer cette date : " + r.error.message, err: true }; confirmSuppr = false; rendre(); return; }
    ouvert = null; brouillon = null; confirmSuppr = false; msg = null;
    await charger();
  }

  function rendreNouveau() {
    const slot = $("pl-nouveau");
    if (ouvert !== "__nouveau") { slot.replaceChildren(); return; }
    const vide = { id: "__nouveau", titre: "", date: "", type: "mariage", statut: "a_confirmer", lieu: "", formule: "", prestation: "photo", prix: null, note: "" };
    slot.replaceChildren(h("section", { class: "pl-nouveau" }, h("h3", null, "Nouvelle date"), fiche(vide, true)));
  }

  function rendreMois(liste) {
    const box = $("pl-mois");
    if (!pret) return;
    if (erreur) { box.replaceChildren(h("div", { class: "pl-etat" }, h("strong", null, "Planning indisponible"), "La base n'a pas répondu : " + erreur)); return; }
    if (!lignes.length) { box.replaceChildren(h("div", { class: "pl-etat" }, h("strong", null, "Aucune date pour l'instant"), "Ajoute ta première date avec « Ajouter une date »."));  return; }
    if (!liste.length) { box.replaceChildren(h("div", { class: "pl-etat" }, h("strong", null, "Rien sur cette période"), vue === "avenir" ? "Aucune date à venir dans le planning." : "Aucune date enregistrée pour cette période.")); return; }
    const ench = enchainements(), groupes = new Map();
    for (const p of liste) { const k = p.date.slice(0, 7); if (!groupes.has(k)) groupes.set(k, []); groupes.get(k).push(p); }
    const blocs = [];
    for (const [k, arr] of groupes) {
      const [a, m] = k.split("-").map(Number);
      const nM = arr.filter(p => p.type === "mariage" && p.statut !== "annule").length, nA = arr.length - nM;
      const c = [nM ? nM + " mariage" + (nM > 1 ? "s" : "") : null, nA ? nA + " autre" + (nA > 1 ? "s" : "") : null].filter(Boolean).join(" · ");
      blocs.push(h("section", { class: "pl-mois", id: "plm-" + k },
        h("div", { class: "pl-mois-t" }, h("h3", null, MOIS[m - 1] + " " + a), h("span", null, c)),
        h("ul", { class: "pl-liste" }, arr.map(p => ligne(p, ench)))));
    }
    box.replaceChildren(...blocs);
  }

  // Après la création d'un contrat en ligne : on le rattache à la date du planning, ou on crée la date.
  async function apresContrat(c) {
    if (!sb || !c) return;
    const jour = versIso(c.date_mariage); if (!jour) return;
    const liaison = { contract_id: c.id, statut: "envoye", envoye_le: iso(auj()), formule: c.forfait || null, prix: num(c.prix), prestation: c.prestation || null };
    const { data } = await sb.from("prestations").select("id,type,statut").eq("date", jour).is("contract_id", null);
    const libres = (data || []).filter(p => p.type === "mariage" && p.statut !== "annule");
    if (libres.length === 1) await sb.from("prestations").update(liaison).eq("id", libres[0].id);
    else await sb.from("prestations").insert(Object.assign({ date: jour, titre: c.titre, type: "mariage", source: "site" }, liaison));
    await charger();
  }

  window.planning = {
    init(client) { if (sb) { charger(); return; } sb = client; construire(); charger(); },
    charger,
    apresContrat
  };
})();
