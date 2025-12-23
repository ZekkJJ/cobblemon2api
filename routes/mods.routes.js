/**
 * Mods Routes - Endpoints para gestión de mods del servidor
 * Cobblemon Los Pitufos
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Note: Caching can be implemented here if needed for performance

/**
 * Initialize mods routes with database connection
 */
function initModsRoutes(getDb) {
  
  // Helper to get mods collection
  const getModsCollection = () => getDb().collection('mods');
  
  // Helper to calculate package version based on mod versions
  const calculatePackageVersion = (mods) => {
    const hash = crypto.createHash('md5');
    mods.forEach(m => hash.update(`${m._id}:${m.version}`));
    return hash.digest('hex').substring(0, 8);
  };

  // ============================================
  // GET /api/mods - List all active mods
  // ============================================
  router.get('/', async (req, res) => {
    try {
      const mods = await getModsCollection().find({ isActive: true }).toArray();
      
      // Calculate counts
      const requiredMods = mods.filter(m => m.category === 'required');
      const optionalMods = mods.filter(m => m.category === 'optional');
      const resourcePacks = mods.filter(m => m.category === 'resourcepack');
      
      // Calculate package info
      const totalSize = requiredMods.reduce((sum, m) => sum + (m.originalSize || 0), 0);
      const pkgVersion = calculatePackageVersion(requiredMods);
      
      res.json({
        mods,
        totalRequired: requiredMods.length,
        totalOptional: optionalMods.length,
        totalResourcePacks: resourcePacks.length,
        packageVersion: pkgVersion,
        packageSize: totalSize,
      });
    } catch (error) {
      console.error('[MODS] Error getting mods:', error);
      res.status(500).json({ error: 'Error al obtener mods' });
    }
  });

  // ============================================
  // GET /api/mods/versions - Get mod versions for update checking
  // ============================================
  router.get('/versions', async (req, res) => {
    try {
      const mods = await getModsCollection().find({ isActive: true }).toArray();
      
      const versions = {};
      mods.forEach(m => {
        versions[m._id.toString()] = m.version;
      });
      
      const requiredMods = mods.filter(m => m.category === 'required');
      const pkgVersion = calculatePackageVersion(requiredMods);
      
      res.json({
        versions,
        packageVersion: pkgVersion,
      });
    } catch (error) {
      console.error('[MODS] Error getting versions:', error);
      res.status(500).json({ error: 'Error al obtener versiones' });
    }
  });

  // ============================================
  // GET /api/mods/package/info - Get package info without downloading
  // ============================================
  router.get('/package/info', async (req, res) => {
    try {
      const mods = await getModsCollection().find({ 
        isActive: true, 
        category: 'required' 
      }).toArray();
      
      const totalSize = mods.reduce((sum, m) => sum + (m.originalSize || 0), 0);
      const pkgVersion = calculatePackageVersion(mods);
      
      res.json({
        version: pkgVersion,
        size: totalSize,
        modCount: mods.length,
        mods: mods.map(m => ({ id: m._id, name: m.name, version: m.version })),
      });
    } catch (error) {
      console.error('[MODS] Error getting package info:', error);
      res.status(500).json({ error: 'Error al obtener info del paquete' });
    }
  });

  // ============================================
  // GET /api/mods/search - Search mods
  // ============================================
  router.get('/search', async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: 'Query parameter required' });
      }
      
      const mods = await getModsCollection().find({
        isActive: true,
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { author: { $regex: q, $options: 'i' } },
        ]
      }).toArray();
      
      res.json({ mods });
    } catch (error) {
      console.error('[MODS] Error searching mods:', error);
      res.status(500).json({ error: 'Error al buscar mods' });
    }
  });

  // ============================================
  // GET /api/mods/:id - Get single mod
  // ============================================
  router.get('/:id', async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      const mod = await getModsCollection().findOne({ 
        _id: new ObjectId(req.params.id),
        isActive: true 
      });
      
      if (!mod) {
        return res.status(404).json({ error: 'Mod no encontrado' });
      }
      
      res.json(mod);
    } catch (error) {
      console.error('[MODS] Error getting mod:', error);
      res.status(500).json({ error: 'Error al obtener mod' });
    }
  });

  // ============================================
  // GET /api/mods/:id/download - Download mod file
  // ============================================
  router.get('/:id/download', async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      const mod = await getModsCollection().findOne({ 
        _id: new ObjectId(req.params.id),
        isActive: true 
      });
      
      if (!mod) {
        return res.status(404).json({ error: 'Mod no encontrado' });
      }
      
      // If mod has a downloadUrl, redirect to it
      if (mod.downloadUrl) {
        return res.redirect(mod.downloadUrl);
      }
      
      // If mod has file stored locally
      if (mod.filePath && fs.existsSync(mod.filePath)) {
        res.setHeader('Content-Disposition', `attachment; filename="${mod.filename}"`);
        res.setHeader('Content-Type', 'application/java-archive');
        return res.sendFile(path.resolve(mod.filePath));
      }
      
      // Fallback: return mod info with download instructions
      res.status(404).json({ 
        error: 'Archivo no disponible',
        mod: {
          name: mod.name,
          version: mod.version,
          website: mod.website,
        },
        message: 'El archivo debe descargarse desde la fuente original'
      });
    } catch (error) {
      console.error('[MODS] Error downloading mod:', error);
      res.status(500).json({ error: 'Error al descargar mod' });
    }
  });

  // ============================================
  // GET /api/mods/package - Download all required mods as ZIP
  // ============================================
  router.get('/package', async (_req, res) => {
    try {
      const archiver = require('archiver');
      
      const mods = await getModsCollection().find({ 
        isActive: true, 
        category: 'required' 
      }).toArray();
      
      if (mods.length === 0) {
        return res.status(404).json({ error: 'No hay mods requeridos' });
      }
      
      const pkgVersion = calculatePackageVersion(mods);
      
      // Set headers for ZIP download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="LosPitufos-Mods-v${pkgVersion}.zip"`);
      
      // Create ZIP archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      archive.on('error', (err) => {
        console.error('[MODS] Archive error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error al generar ZIP' });
        }
      });
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Add README
      const readme = `# Mods de Cobblemon Los Pitufos
      
Versión del paquete: ${pkgVersion}
Fecha: ${new Date().toISOString()}

## Instrucciones de instalación:
1. Cierra Minecraft completamente
2. Copia todos los archivos .jar a tu carpeta de mods:
   - Windows: %appdata%\\.minecraft\\mods
   - Mac: ~/Library/Application Support/minecraft/mods
   - Linux: ~/.minecraft/mods
3. Inicia Minecraft con Fabric Loader 1.20.1

## Mods incluidos:
${mods.map(m => `- ${m.name} v${m.version}`).join('\n')}

## Soporte:
Discord: https://discord.gg/lospitufos
`;
      archive.append(readme, { name: 'LEEME.txt' });
      
      // Download and add each mod
      let addedCount = 0;
      for (const mod of mods) {
        try {
          // Check if mod has local file
          if (mod.filePath && fs.existsSync(mod.filePath)) {
            archive.file(mod.filePath, { name: mod.filename });
            addedCount++;
            console.log(`[MODS] Added local file: ${mod.filename}`);
          }
          // Check if mod has downloadUrl
          else if (mod.downloadUrl) {
            try {
              const response = await fetch(mod.downloadUrl);
              if (response.ok) {
                const buffer = await response.arrayBuffer();
                archive.append(Buffer.from(buffer), { name: mod.filename });
                addedCount++;
                console.log(`[MODS] Downloaded and added: ${mod.filename}`);
              } else {
                console.warn(`[MODS] Failed to download ${mod.name}: ${response.status}`);
                // Add a placeholder text file
                archive.append(`No se pudo descargar ${mod.name}.\nDescarga manual: ${mod.website || mod.downloadUrl}`, 
                  { name: `${mod.slug}-DESCARGAR-MANUAL.txt` });
              }
            } catch (fetchErr) {
              console.warn(`[MODS] Fetch error for ${mod.name}:`, fetchErr.message);
              archive.append(`No se pudo descargar ${mod.name}.\nDescarga manual: ${mod.website || mod.downloadUrl}`, 
                { name: `${mod.slug}-DESCARGAR-MANUAL.txt` });
            }
          }
          // No file available
          else {
            console.warn(`[MODS] No file source for ${mod.name}`);
            archive.append(`Descarga ${mod.name} desde: ${mod.website || 'modrinth.com'}`, 
              { name: `${mod.slug}-DESCARGAR-MANUAL.txt` });
          }
        } catch (modErr) {
          console.error(`[MODS] Error processing mod ${mod.name}:`, modErr);
        }
      }
      
      console.log(`[MODS] Package generated with ${addedCount}/${mods.length} mods`);
      
      // Finalize archive
      await archive.finalize();
      
    } catch (error) {
      console.error('[MODS] Error generating package:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error al generar paquete' });
      }
    }
  });

  // ============================================
  // POST /api/mods - Create new mod (admin only)
  // ============================================
  router.post('/', async (req, res) => {
    try {
      const { 
        name, 
        description, 
        version, 
        category, 
        modLoader, 
        minecraftVersion,
        author,
        website,
        downloadUrl,
        filename,
        originalSize,
        changelog,
      } = req.body;
      
      if (!name || !description || !category) {
        return res.status(400).json({ error: 'name, description, and category are required' });
      }
      
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      const newMod = {
        name,
        slug,
        version: version || '1.0.0',
        description,
        category: category || 'optional',
        modLoader: modLoader || 'fabric',
        minecraftVersion: minecraftVersion || '1.20.1',
        author: author || '',
        website: website || '',
        downloadUrl: downloadUrl || '',
        filename: filename || `${slug}.jar`,
        originalSize: originalSize || 0,
        compressedSize: 0,
        checksum: '',
        changelog: changelog || '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        previousVersions: [],
      };
      
      const result = await getModsCollection().insertOne(newMod);
      newMod._id = result.insertedId;
      
      console.log(`[MODS] Created mod: ${name}`);
      res.status(201).json(newMod);
    } catch (error) {
      console.error('[MODS] Error creating mod:', error);
      res.status(500).json({ error: 'Error al crear mod' });
    }
  });

  // ============================================
  // PUT /api/mods/:id - Update mod (admin only)
  // ============================================
  router.put('/:id', async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      const modId = new ObjectId(req.params.id);
      
      const existingMod = await getModsCollection().findOne({ _id: modId });
      if (!existingMod) {
        return res.status(404).json({ error: 'Mod no encontrado' });
      }
      
      const updateData = { ...req.body, updatedAt: new Date() };
      delete updateData._id; // Don't update _id
      
      // If version changed, archive old version
      if (updateData.version && updateData.version !== existingMod.version) {
        updateData.previousVersions = [
          ...(existingMod.previousVersions || []),
          {
            version: existingMod.version,
            filename: existingMod.filename,
            uploadedAt: existingMod.updatedAt,
          }
        ];
      }
      
      await getModsCollection().updateOne(
        { _id: modId },
        { $set: updateData }
      );
      
      const updatedMod = await getModsCollection().findOne({ _id: modId });
      console.log(`[MODS] Updated mod: ${updatedMod.name}`);
      res.json(updatedMod);
    } catch (error) {
      console.error('[MODS] Error updating mod:', error);
      res.status(500).json({ error: 'Error al actualizar mod' });
    }
  });

  // ============================================
  // DELETE /api/mods/:id - Soft delete mod (admin only)
  // ============================================
  router.delete('/:id', async (req, res) => {
    try {
      const { ObjectId } = require('mongodb');
      const modId = new ObjectId(req.params.id);
      
      const result = await getModsCollection().updateOne(
        { _id: modId },
        { $set: { isActive: false, deletedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Mod no encontrado' });
      }
      
      console.log(`[MODS] Soft deleted mod: ${req.params.id}`);
      res.json({ success: true, message: 'Mod eliminado' });
    } catch (error) {
      console.error('[MODS] Error deleting mod:', error);
      res.status(500).json({ error: 'Error al eliminar mod' });
    }
  });

  return router;
}

module.exports = { initModsRoutes };
