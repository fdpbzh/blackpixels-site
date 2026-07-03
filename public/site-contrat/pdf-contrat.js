// Génération du PDF de contrat à partir du modèle AcroForm (modele.pdf)
// Nécessite pdf-lib (PDFLib) chargé au préalable.

async function genererPdfContrat(c) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const bytes = await fetch('modele.pdf').then(r => {
    if (!r.ok) throw new Error('modele.pdf introuvable');
    return r.arrayBuffer();
  });
  const doc = await PDFDocument.load(bytes);
  const form = doc.getForm();
  const set = (n, v) => { try { form.getTextField(n).setText(v || ''); } catch (e) {} };

  // Page 1 - clients
  set('nom_mariee', c.nom_mariee);
  set('nom_marie', c.nom_marie);
  set('adresse', c.adresse);
  set('code_postal', c.code_postal);
  set('ville', c.ville);
  set('mobile_mariee', c.mobile_mariee);
  set('mobile_marie', c.mobile_marie);
  set('email', c.email);
  set('lieu_reception', c.lieu_reception);

  // Page 3 : choix de diffusion des images
  set('droit_image', c.droit_image === true ? 'autorisée' : c.droit_image === false ? 'refusée' : '');

  // Page 2 - photographe
  set('prestation', c.prestation || 'photo');
  set('date_mariage', c.date_mariage);
  set('forfait', c.forfait);
  set('prix', c.prix);
  set('acompte_pct', c.acompte_pct);
  set('acompte_eur', c.acompte_eur);
  set('solde_pct', c.solde_pct);
  set('solde_eur', c.solde_eur);
  set('delai_livraison', c.delai_livraison);
  set('signature_photographe_date', c.photographe_date);
  set('signature_photographe_lieu', c.photographe_lieu);
  set('signature_clients_lieu', c.clients_lieu);
  set('signature_clients_date', c.clients_date);

  // Signature des mariés dans la zone en pointillés (page 2)
  if (c.signature_png) {
    const page = doc.getPages()[1];
    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Intérieur de la zone en pointillés (repère PDF, origine en bas à gauche)
    page.drawRectangle({ x: 332, y: 53.5, width: 196, height: 70, color: rgb(0.98, 0.973, 0.957) });

    const png = await doc.embedPng(c.signature_png);
    const box = { x: 336, y: 66, w: 188, h: 52 };
    const s = Math.min(box.w / png.width, box.h / png.height, 1);
    const w = png.width * s, h = png.height * s;
    page.drawImage(png, {
      x: box.x + (box.w - w) / 2,
      y: box.y + (box.h - h) / 2,
      width: w, height: h
    });

    const noms = [c.nom_mariee, c.nom_marie].filter(Boolean).join(' & ');
    const horo = c.signed_at
      ? new Date(c.signed_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
      : '';
    const mention = `Bon pour accord - ${noms}` + (horo ? ` - signé électroniquement le ${horo}` : '');
    const size = 5.5;
    const tw = font.widthOfTextAtSize(mention, size);
    page.drawText(mention, {
      x: 430 - tw / 2, y: 57, size, font, color: rgb(0.35, 0.35, 0.35)
    });
  }

  form.updateFieldAppearances();
  form.flatten();
  return await doc.save();
}

function telechargerPdf(bytes, nomFichier) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function nomFichierContrat(c) {
  const noms = [c.nom_mariee, c.nom_marie].filter(Boolean).join(' et ') || c.titre || 'contrat';
  return `Contrat Black Pixels - ${noms}.pdf`.replace(/[\\/:*?"<>|]/g, '');
}
