import { App, Notice, TFile } from "obsidian";
import type { KBBookMetadata, KBPluginSettings } from "../types";
import type { TemplateEngine } from "../template/engine";
import type { TemplateReader } from "../template/reader";
import type { CoverDownloadService } from "./CoverDownloadService";

export interface BookNoteCreationOptions {
  /**
   * Whether to open the file after creating it
   */
  openFile?: boolean;

  /**
   * Whether to run Templater plugin after creation
   */
  runTemplater?: boolean;

  /**
   * Whether to show success notice
   */
  showNotice?: boolean;

  /**
   * Whether to show cover download source in notice
   */
  showCoverSource?: boolean;
}

export interface BookNoteCreationResult {
  /**
   * The created or updated file
   */
  file: TFile | null;

  /**
   * Whether the file was newly created (vs updated)
   */
  wasCreated: boolean;

  /**
   * The file path
   */
  filePath: string;

  /**
   * The rendered filename (without extension)
   */
  filename: string;
}

/**
 * Service responsible for creating book notes from metadata.
 * Handles template rendering, file creation, and optional cover downloads.
 */
export class BookNoteCreatorService {
  constructor(
    private app: App,
    private templateEngine: TemplateEngine,
    private templateReader: TemplateReader,
    private coverDownloadService: CoverDownloadService,
    private settings: KBPluginSettings
  ) {}

  /**
   * Create or update a book note from metadata
   *
   * @param metadata - Book metadata to create note from
   * @param options - Creation options
   * @returns Result of the creation operation
   */
  async createBookNote(
    metadata: KBBookMetadata,
    options: BookNoteCreationOptions = {}
  ): Promise<BookNoteCreationResult> {
    const {
      openFile = true,
      runTemplater = true,
      showNotice = true,
      showCoverSource = false,
    } = options;

    try {
      console.log("[KB Plugin] Creating note for:", metadata.title);

      // Download cover first if enabled (so we have local path for template)
      if (this.settings.downloadCovers && metadata.coverUrl) {
        const coverPath = await this.coverDownloadService.downloadAndSaveCover(metadata, {
          showNotice: false,
          showSource: showCoverSource,
        });

        if (coverPath) {
          metadata.localCoverImage = coverPath;
        }
      }

      // Render filename from pattern
      const filename = this.templateEngine.renderFilename(
        this.settings.filenamePattern,
        metadata
      );

      // Get the book notes folder path
      const folderPath = this.settings.bookNotesFolder;

      // Ensure the folder exists
      await this.ensureFolderExists(folderPath);

      // Create the full file path
      const filePath = `${folderPath}/${filename}.md`;

      // Check if file already exists
      const fileExists = await this.app.vault.adapter.exists(filePath);

      // Get template content
      const templateContent = await this.getTemplateContent();

      // Render template with metadata
      const renderedContent = this.templateEngine.render(templateContent, metadata);

      // Create or update file
      let file: TFile | null = null;
      if (fileExists) {
        // File exists, replace it
        const abstractFile = this.app.vault.getAbstractFileByPath(filePath);
        if (abstractFile instanceof TFile) {
          console.log("[KB Plugin] Updating existing note:", filePath);
          await this.app.vault.modify(abstractFile, renderedContent);
          file = abstractFile;
        }
      } else {
        // Create new file
        console.log("[KB Plugin] Creating new note:", filePath);
        file = await this.app.vault.create(filePath, renderedContent);
      }

      // Open the note if requested
      if (file && openFile) {
        const leaf = this.app.workspace.getLeaf(false);
        await leaf.openFile(file);
      }

      // Run Templater if available and requested
      if (file && runTemplater) {
        await this.runTemplaterIfAvailable(file);
      }

      // Show success notice
      if (showNotice) {
        const action = fileExists ? "updated" : "created";
        new Notice(`Book note ${action}: ${filename}`);
      }

      return {
        file,
        wasCreated: !fileExists,
        filePath,
        filename,
      };
    } catch (error) {
      console.error("[KB Plugin] Error creating book note:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (showNotice) {
        new Notice(`Error creating book note: ${errorMessage}`);
      }

      throw error;
    }
  }

  /**
   * Ensure a folder exists, creating it if necessary
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    const folderExists = await this.app.vault.adapter.exists(folderPath);

    if (!folderExists) {
      console.log("[KB Plugin] Creating folder:", folderPath);
      await this.app.vault.createFolder(folderPath);
    }
  }

  /**
   * Get template content from settings or use default
   */
  private async getTemplateContent(): Promise<string> {
    if (this.settings.useTemplate && this.settings.templatePath) {
      const customTemplate = await this.templateReader.readTemplate(
        this.settings.templatePath
      );
      return customTemplate || this.templateReader.getDefaultTemplate();
    } else {
      return this.templateReader.getDefaultTemplate();
    }
  }

  /**
   * Run Templater plugin if it's installed in the vault
   */
  private async runTemplaterIfAvailable(file: TFile): Promise<void> {
    try {
      // Check if Templater plugin is installed and enabled
      const templaterPlugin = (this.app as any).plugins?.plugins?.["templater-obsidian"];

      if (templaterPlugin) {
        console.log("[KB Plugin] Templater plugin detected, running...");

        // Get Templater's API
        const templater = templaterPlugin.templater;

        if (templater && typeof templater.overwrite_file_templates === "function") {
          await templater.overwrite_file_templates(file);
          console.log("[KB Plugin] Templater processing complete");
        } else {
          console.log("[KB Plugin] Templater API not available");
        }
      } else {
        console.log("[KB Plugin] Templater plugin not installed");
      }
    } catch (error) {
      console.error("[KB Plugin] Error running Templater:", error);
      // Don't show error to user - Templater is optional
    }
  }
}
