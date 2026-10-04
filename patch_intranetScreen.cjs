const fs = require('fs');
let content = fs.readFileSync('ztna-client/screens/IntranetScreen.tsx', 'utf8');

// 1. Add DocumentPicker import
content = content.replace(
    /import \{ useTheme \} from '\.\.\/utils\/ThemeContext';/m,
    `import { useTheme } from '../utils/ThemeContext';\nimport * as DocumentPicker from 'expo-document-picker';`
);

// 2. Update DocumentsTab arguments
content = content.replace(
    /const DocumentsTab = \(\{ email, secretData, isLoading, downloadSecretPdf, notices, fetchNotices, createNotice, deleteNotice, updateNotice, styles, colors, allowDownload \}: any\) => \{/,
    `const DocumentsTab = ({ email, isLoading, documents, fetchDocuments, uploadDocument, downloadDocument, notices, noticePage, noticeTotalPages, fetchNotices, createNotice, deleteNotice, updateNotice, styles, colors, allowDownload }: any) => {`
);

// 3. Add useFocusEffect for documents and new states for upload modal
content = content.replace(
    /fetchNotices\(\);\n        \}, \[\]\)\n    \);/,
    `fetchNotices(1);\n            fetchDocuments();\n        }, [])\n    );\n\n    const [uploadModalVisible, setUploadModalVisible] = useState(false);\n    const [docTitle, setDocTitle] = useState('');\n    const [docDesc, setDocDesc] = useState('');\n    const [selectedFile, setSelectedFile] = useState<any>(null);`
);

// 4. Add handleUpload function
content = content.replace(
    /const handleCreate = async \(\) => \{/,
    `const handleUpload = async () => {\n        if (!docTitle || !selectedFile) { alert('제목과 파일을 선택해주세요.'); return; }\n        const success = await uploadDocument(docTitle, docDesc, selectedFile);\n        if (success) { setUploadModalVisible(false); setDocTitle(''); setDocDesc(''); setSelectedFile(null); }\n    };\n\n    const pickDocument = async () => {\n        let result = await DocumentPicker.getDocumentAsync({});\n        if (!result.canceled) { setSelectedFile(result.assets[0]); }\n    };\n\n    const handleCreate = async () => {`
);

// 5. Replace Top Secret View with Horizontal ScrollView
const topSecretRegex = /<View style=\{styles\.cardFeatured\}>\s*<Text style=\{styles\.heading3\}>Top Secret<\/Text>[\s\S]*?<\/TouchableOpacity>\s*<\/View>/m;

const horizontalDocViewer = `
            <View style={{ marginBottom: 16 }}>
                <Text style={[styles.heading3, { marginBottom: 12 }]}>Top Secret Documents</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
                    {isLoading && documents?.length === 0 ? (
                        <View style={[styles.cardFeatured, { width: 280, marginRight: 16 }]}>
                            <SkeletonLoader height={24} width="100%" style={{ marginBottom: 12 }} />
                            <SkeletonLoader height={24} width="70%" />
                        </View>
                    ) : (
                        documents?.map((doc: any) => (
                            <View key={doc.id} style={[styles.cardFeatured, { width: 280, marginRight: 16 }]}>
                                <Text style={[styles.infoText, { fontWeight: '700', fontSize: 18, marginBottom: 4 }]} numberOfLines={2}>{doc.title}</Text>
                                <Text style={[styles.noticeMeta, { marginBottom: 16 }]} numberOfLines={2}>{doc.description}</Text>
                                <View style={{ flex: 1 }} />
                                <Text style={[styles.noticeMeta, { marginBottom: 12 }]}>{doc.original_name}</Text>
                                <TouchableOpacity 
                                    style={[styles.buttonOutline, { marginBottom: 0, flexDirection: 'row', justifyContent: 'center', opacity: allowDownload ? 1 : 0.5 }]} 
                                    onPress={() => downloadDocument(doc.id, doc.original_name)} 
                                    disabled={isLoading || !allowDownload}
                                >
                                    <Icon name={allowDownload ? "download" : "lock"} size={16} color={colors.text} style={{ marginRight: 8 }} />
                                    <Text style={styles.buttonOutlineText}>{allowDownload ? 'Download PDF' : 'Download Disabled'}</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                    
                    {allowDownload && (
                        <TouchableOpacity 
                            style={[styles.cardFeatured, { width: 280, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: colors.borderSoft, backgroundColor: 'transparent' }]}
                            onPress={() => setUploadModalVisible(true)}
                        >
                            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                                <Icon name="plus" size={24} color={colors.onPrimary} />
                            </View>
                            <Text style={[styles.infoText, { fontWeight: 'bold' }]}>새 문서 업로드</Text>
                            <Text style={styles.noticeMeta}>CORPORATE 전용</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>
`;

content = content.replace(topSecretRegex, horizontalDocViewer);

// 6. Add pagination to Notice Board
const noticeMapEndRegex = /\{notices\.map\(\(notice: any\) => \{([\s\S]*?)\}\)\}/m;
const paginationUI = `
                {notices.map((notice: any) => {
                    $1
                })}
                
                {/* Pagination Controls */}
                <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, marginBottom: 32 }}>
                    <TouchableOpacity onPress={() => fetchNotices(noticePage - 1)} disabled={noticePage <= 1} style={{ padding: 8, opacity: noticePage <= 1 ? 0.3 : 1 }}>
                        <Icon name="chevron-left" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.infoText, { marginHorizontal: 16, fontWeight: 'bold' }]}>{noticePage} / {noticeTotalPages}</Text>
                    <TouchableOpacity onPress={() => fetchNotices(noticePage + 1)} disabled={noticePage >= noticeTotalPages} style={{ padding: 8, opacity: noticePage >= noticeTotalPages ? 0.3 : 1 }}>
                        <Icon name="chevron-right" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
`;
content = content.replace(noticeMapEndRegex, paginationUI);

// 7. Add upload modal before existing modals
const newModalRegex = /\{\/\* 새 글 작성 모달 \*\/\}/m;
const uploadModalUI = `
            {/* 새 문서 업로드 모달 */}
            <Modal visible={uploadModalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isDesktop && { maxWidth: 600, width: '100%', alignSelf: 'center' }]}>
                        <Text style={styles.heading2}>Upload Secret Document</Text>
                        <TextInput style={styles.input} placeholder="문서 제목" placeholderTextColor={colors.subText} value={docTitle} onChangeText={setDocTitle} />
                        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="문서 설명 (선택)" placeholderTextColor={colors.subText} multiline value={docDesc} onChangeText={setDocDesc} />
                        
                        <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center', marginBottom: 16 }]} onPress={pickDocument}>
                            <Icon name="file-plus" size={20} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonOutlineText}>{selectedFile ? selectedFile.name : '파일 선택하기'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.button, { flexDirection: 'row', justifyContent: 'center' }]} onPress={handleUpload}>
                            <Icon name="upload-cloud" size={20} color={colors.onPrimary} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonText}>Upload</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.buttonOutline, { flexDirection: 'row', justifyContent: 'center' }]} onPress={() => {setUploadModalVisible(false); setSelectedFile(null);}}>
                            <Icon name="x" size={20} color={colors.text} style={{ marginRight: 8 }} />
                            <Text style={styles.buttonOutlineText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 새 글 작성 모달 */}
`;
content = content.replace(newModalRegex, uploadModalUI);

fs.writeFileSync('ztna-client/screens/IntranetScreen.tsx', content);
console.log('IntranetScreen patched successfully.');
